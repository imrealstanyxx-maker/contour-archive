// GitHub Issues API для наблюдений сообщества

window.contourGitHub = (() => {
  'use strict';

  const API_BASE = 'https://api.github.com';

  function getConfig() {
    // Ждём загрузки CONTOUR_CONFIG
    if (!window.CONTOUR_CONFIG) {
      throw new Error('CONTOUR_CONFIG не найден. Убедитесь, что assets/config.js загружен перед assets/github-issues.js');
    }
    const repo = window.CONTOUR_CONFIG.GITHUB_REPO;
    const token = window.CONTOUR_CONFIG.GITHUB_TOKEN;
    
    if (!repo || repo === 'owner/repo') {
      throw new Error('GITHUB_REPO не настроен в assets/config.js');
    }
    if (!token || token === 'YOUR_GITHUB_TOKEN_HERE') {
      throw new Error('GITHUB_TOKEN не настроен в assets/config.js');
    }
    
    return { repo, token };
  }

  function getHeaders() {
    const { token } = getConfig();
    return {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Парсинг метаданных из body issue
  function parseIssueBody(body) {
    try {
      // Формат: YAML frontmatter + markdown body
      const yamlMatch = body.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (yamlMatch) {
        const yaml = yamlMatch[1];
        const content = yamlMatch[2];
        
        const meta = {};
        yaml.split('\n').forEach(line => {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            // Обработка null
            if (value === 'null') {
              meta[key] = null;
              return;
            }
            
            // Убираем кавычки если есть
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1);
            }
            meta[key] = value;
          }
        });
        
        return { meta, body: content };
      }
      
      // Fallback: просто body
      return { meta: {}, body };
    } catch (e) {
      console.warn('Error parsing issue body:', e);
      return { meta: {}, body };
    }
  }

  // Создание issue
  async function createIssue(data) {
    try {
      const { repo } = getConfig();
      const { title, body, dossier_id, evidence, location, observed_at, username } = data;
      
      // Формируем body с метаданными
      const metaYaml = [
        `dossier_id: ${dossier_id || 'null'}`,
        `evidence: ${evidence ? `"${evidence.replace(/"/g, '\\"')}"` : 'null'}`,
        `location: ${location ? `"${location.replace(/"/g, '\\"')}"` : 'null'}`,
        `observed_at: ${observed_at || 'null'}`,
        `username: ${username || 'unknown'}`
      ].join('\n');
      
      const issueBody = `---\n${metaYaml}\n---\n\n${body}`;
      
      const response = await fetch(`${API_BASE}/repos/${repo}/issues`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: title,
          body: issueBody,
          labels: ['pending'] // По умолчанию pending
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const issue = await response.json();
      return issue;
    } catch (error) {
      console.error('Error creating issue:', error);
      throw error;
    }
  }

  // Получение всех issues
  async function getIssues(options = {}) {
    try {
      const { repo } = getConfig();
      const { dossier_id, labels, state = 'all' } = options;
      
      let url = `${API_BASE}/repos/${repo}/issues?state=${state}&per_page=100`;
      
      if (labels && labels.length > 0) {
        url += `&labels=${labels.join(',')}`;
      }
      
      const response = await fetch(url, {
        headers: getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const issues = await response.json();
      
      // Фильтруем по dossier_id если указан
      let filtered = issues;
      if (dossier_id) {
        filtered = issues.filter(issue => {
          const { meta } = parseIssueBody(issue.body);
          return meta.dossier_id === dossier_id;
        });
      }
      
      // Преобразуем в формат reports
      return filtered.map(issue => {
        const { meta, body } = parseIssueBody(issue.body);
        const status = getStatusFromLabels(issue.labels);
        
        return {
          id: issue.number.toString(), // Используем номер issue как ID
          title: issue.title,
          body: body,
          dossier_id: meta.dossier_id || null,
          evidence: meta.evidence || null,
          location: meta.location || null,
          observed_at: meta.observed_at || null,
          status: status,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          username: meta.username || issue.user?.login || 'unknown',
          issue_url: issue.html_url,
          issue_number: issue.number
        };
      });
    } catch (error) {
      console.error('Error getting issues:', error);
      throw error;
    }
  }

  // Определение статуса по labels
  function getStatusFromLabels(labels) {
    const labelNames = labels.map(l => typeof l === 'string' ? l : l.name);
    
    if (labelNames.includes('approved')) return 'final_approved';
    if (labelNames.includes('unofficial')) return 'unofficial_approved';
    if (labelNames.includes('rejected')) return 'rejected';
    return 'pending';
  }

  return {
    createIssue,
    getIssues,
    getStatusFromLabels
  };
})();

