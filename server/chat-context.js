// 对话上下文水位管理：估算 token 占用，接近上限时清理早期消息并截断超长消息

// 中文为主，按 2 字符/token 保守估算（宁可多估，避免触发 Ollama 超上下文报错）
function estimateTokens(text) {
  return Math.ceil(String(text).length / 2);
}

function manageChatContext(systemPrompt, history, numCtx, resetRatio) {
  const hist = history.slice();
  const ratio = resetRatio || 0.7;
  const resetThreshold = Math.floor(numCtx * ratio);
  let contextReset = false;
  let total = estimateTokens(systemPrompt) + hist.reduce((s, m) => s + estimateTokens(m.content || ''), 0);

  if (total > resetThreshold) {
    // 从最旧的消息开始丢，丢到安全水位（45%）
    const watermark = Math.floor(numCtx * 0.45);
    while (hist.length > 1 && total > watermark) {
      total -= estimateTokens(hist[0].content || '');
      hist.shift();
      contextReset = true;
    }
    // 单条超长消息（如粘贴大段代码）截断到 30% 上下文以内
    const last = hist[hist.length - 1];
    const maxMsgTokens = Math.floor(numCtx * 0.3);
    if (last && estimateTokens(last.content || '') > maxMsgTokens) {
      last.content = String(last.content).slice(0, maxMsgTokens * 2);
      contextReset = true;
    }
  }

  return { history: hist, contextReset };
}

module.exports = { estimateTokens, manageChatContext };
