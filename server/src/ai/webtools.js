import * as cheerio from 'cheerio';

export async function webSearch(query) {
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    
    $('.result-link').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).text().trim();
      const url = $(el).attr('href');
      const snippet = $(el).parent().next('.result-snippet').text().trim();
      if (title && url) {
        results.push({ title, url, snippet: snippet || '' });
      }
    });
    
    // Fallback: try alternative selectors
    if (results.length === 0) {
      $('a.result__a, a[href]').each((i, el) => {
        if (i >= 5) return false;
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text && !href.includes('duckduckgo.com') && href.startsWith('http')) {
          results.push({ title: text, url: href, snippet: '' });
        }
      });
    }
    
    if (results.length === 0) {
      return `搜索 "${query}" 未找到相关结果。`;
    }
    
    return results.map((r, i) => 
      `${i + 1}. ${r.title}\n   ${r.snippet}\n   链接: ${r.url}`
    ).join('\n\n');
  } catch (error) {
    console.error('Web search error:', error.message);
    return `搜索失败: ${error.message}`;
  }
}

export async function webFetch(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove script, style, nav elements
    $('script, style, nav, footer, header, aside, .sidebar, .menu, .nav').remove();
    
    // Get main content
    let text = $('main, article, .content, .post, .entry, body').first().text();
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    // Truncate if too long
    if (text.length > 3000) {
      text = text.substring(0, 3000) + '\n\n[内容已截断]';
    }
    
    return text || '无法获取网页内容';
  } catch (error) {
    console.error('Web fetch error:', error.message);
    return `获取网页失败: ${error.message}`;
  }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'web_search':
      return await webSearch(args.query);
    case 'web_fetch':
      return await webFetch(args.url);
    default:
      return `未知工具: ${name}`;
  }
}
