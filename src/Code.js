// LINE 群組檔案 → Google Drive 自動備份（Google Apps Script）
// API Key 放 Script Properties：LINE_CHANNEL_ACCESS_TOKEN、WEBHOOK_TOKEN、ROOT_FOLDER_ID

const TARGET_TYPES = ['image', 'video', 'audio', 'file'];
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
};
const GROUP_NAME_CACHE_SEC = 6 * 60 * 60;

// ---------- 純函式（不碰 GAS 全域物件，可用 node 測） ----------

function pickTargetEvents(events) {
  return (events || []).filter(
    (ev) =>
      ev.type === 'message' &&
      ev.source && ev.source.type === 'group' &&
      ev.message && TARGET_TYPES.includes(ev.message.type)
  );
}

function formatStamp(ms) {
  // yyyyMMdd_HHmmss，固定 Asia/Taipei（UTC+8）
  const d = new Date(ms + 8 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `_${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}

function buildFileName(event, contentType) {
  const stamp = formatStamp(event.timestamp);
  const msg = event.message;
  if (msg.type === 'file' && msg.fileName) {
    return `${stamp}_${msg.fileName}`;
  }
  const mime = (contentType || '').split(';')[0].trim();
  const ext = EXT_BY_MIME[mime];
  return `${stamp}_${msg.id}${ext ? '.' + ext : ''}`;
}

// ---------- GAS 進入點 ----------

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  // ponytail: GAS 的 doPost 拿不到 header，無法驗 x-line-signature，改用 URL token 擋陌生來源
  if (!e.parameter || e.parameter.token !== props.getProperty('WEBHOOK_TOKEN')) {
    // ContentService 無法改 HTTP status code，只能回文字並不處理
    return ContentService.createTextOutput('forbidden');
  }

  let events = [];
  try {
    events = pickTargetEvents(JSON.parse(e.postData.contents).events);
  } catch (err) {
    console.error('bad payload', err);
    return ContentService.createTextOutput('bad request');
  }

  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const root = DriveApp.getFolderById(props.getProperty('ROOT_FOLDER_ID'));

  events.forEach((ev) => {
    try {
      saveEvent(ev, token, root);
    } catch (err) {
      console.error(`save failed msg=${ev.message.id} group=${ev.source.groupId}`, err);
    }
  });

  return ContentService.createTextOutput('ok');
}

function saveEvent(ev, token, root) {
  const folder = getGroupFolder(root, ev.source.groupId, token);
  // ponytail: UrlFetchApp 單次回應上限約 50MB，超過會 throw，記 log 即可
  const res = UrlFetchApp.fetch(
    `https://api-data.line.me/v2/bot/message/${ev.message.id}/content`,
    { headers: { Authorization: `Bearer ${token}` }, muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) {
    throw new Error(`content fetch ${res.getResponseCode()}: ${res.getContentText()}`);
  }
  const name = buildFileName(ev, res.getHeaders()['Content-Type']);
  folder.createFile(res.getBlob().setName(name));
}

function getGroupFolder(root, groupId, token) {
  const name = getGroupName(groupId, token);
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

function getGroupName(groupId, token) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(`group:${groupId}`);
  if (cached) return cached;

  let name = groupId;
  try {
    const res = UrlFetchApp.fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() === 200) {
      const n = JSON.parse(res.getContentText()).groupName;
      if (n) name = n.replace(/[\/\\:*?"<>|]/g, '_');
    }
  } catch (err) {
    console.error(`group summary failed ${groupId}`, err);
  }
  cache.put(`group:${groupId}`, name, GROUP_NAME_CACHE_SEC);
  return name;
}
