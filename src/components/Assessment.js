import { state } from '../state.js';
import { t } from '../i18n.js';

export function createAssessment(container) {
  const el = document.createElement('div');
  el.className = 'assessment-container';
  container.appendChild(el);

  let errorsExpanded = false;

  function render() {
    const ai = state.get('aiAssessment');
    const oldStatus = state.get('currentStatus');
    const hasReadings = state.get('readings').length > 0;
    const errors = state.get('aiErrors') || [];

    // Base fallback if no AI assessment object yet
    if (!ai) {
      el.innerHTML = renderFallback(oldStatus, hasReadings);
      renderErrors(errors);
      updateTabIcon(oldStatus, hasReadings);
      return;
    }

    // AI is analyzing
    if (ai.status === 'analyzing') {
      const tierLabel = ai.tier === 'pro' ? t('assessment_tier_pro') : t('assessment_tier_flash');
      el.innerHTML = `
        <div class="assessment-status status-warning ai-analyzing">
          <span class="status-icon" style="display:inline-block; animation: spin-slow 2s linear infinite;">⏳</span>
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <span class="status-text">${t('status_analyzing')}</span>
            <span class="ai-tier-badge" style="font-size:0.75rem; margin-top:4px;">${tierLabel}</span>
          </div>
        </div>
      `;
      renderErrors(errors);
      updateTabIcon('analyzing', true);
      return;
    }

    // AI is complete
    const statusMap = {
      ok: { icon: '✅', color: 'status-ok' },
      warning: { icon: '⚠️', color: 'status-warning' },
      critical: { icon: '🚨', color: 'status-critical' },
      idle: { icon: '⌛', color: 'status-idle' }
    };
    
    const s = statusMap[ai.status] || statusMap.ok;
    let tierLabel = ai.tier === 'pro' ? t('assessment_tier_pro') : t('assessment_tier_flash');
    if (ai.isUpgrading) {
      tierLabel += ' <span style="display:inline-block; margin-left:4px; font-size:0.75rem; animation: spin-slow 2s linear infinite;">⏳</span>';
    }
    const confLabel = t('assessment_confidence_' + (ai.confidence || 'medium'));

    // Details cards
    let detailsHtml = '';
    if (ai.details && ai.details.length > 0) {
      detailsHtml = '<div class="ai-details-grid">';
      ai.details.forEach(d => {
        detailsHtml += `
          <div class="ai-category-card severity-${d.severity || 'ok'}">
            <h4>${d.category}</h4>
            <p>${d.assessment}</p>
          </div>
        `;
      });
      detailsHtml += '</div>';
    }

    // Recommendations
    let recsHtml = '';
    if (ai.recommendations && ai.recommendations.length > 0) {
      recsHtml = `
        <div class="ai-section ai-recommendations">
          <h4>${t('assessment_recommendations')}</h4>
          <ul>
            ${ai.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Trends
    let trendsHtml = '';
    if (ai.trends) {
      trendsHtml = `
        <div class="ai-section ai-trends">
          <h4>${t('assessment_trends')}</h4>
          <p>${ai.trends}</p>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="ai-assessment-card border-${s.color}">
        <div class="ai-header ${s.color}">
          <span class="status-icon">${s.icon}</span>
          <div class="ai-header-text">
            <h3>${ai.summary || ''}</h3>
            <div class="ai-badges">
              <span class="ai-tier-badge tier-${ai.tier}">${tierLabel}</span>
              <span class="ai-conf-badge">Konfidens: ${confLabel}</span>
            </div>
          </div>
        </div>
        
        <div class="ai-body">
          ${detailsHtml}
          ${trendsHtml}
          ${recsHtml}
        </div>
      </div>
    `;

    renderErrors(errors);
    updateTabIcon(ai.status, true);
  }

  function renderFallback(status, hasReadings) {
    let icon = '⌛';
    let text = t('status_idle');
    let colorClass = 'status-idle';

    if (status === 'processing') {
      icon = '⏳'; text = t('status_processing'); colorClass = 'status-warning';
    } else if (hasReadings) {
      if (status === 'ok') { icon = '✅'; text = t('status_ok'); colorClass = 'status-ok'; }
      if (status === 'warning') { icon = '⚠️'; text = t('status_warning'); colorClass = 'status-warning'; }
      if (status === 'critical') { icon = '🚨'; text = t('status_critical'); colorClass = 'status-critical'; }
    }

    const opacityStyle = hasReadings ? '' : 'style="opacity: 0.7; border: 1px dashed #555;"';
    
    return `
      <div class="assessment-status ${colorClass}" ${opacityStyle} ${status==='processing'?'style="animation: pulse 1.5s infinite;"':''}>
        <span class="status-icon">${icon}</span>
        <span class="status-text">${text}</span>
      </div>
    `;
  }

  function renderErrors(errors) {
    // We append the error log to the container so it sits below the card
    const errContainer = document.createElement('div');
    errContainer.className = 'ai-errors-container';
    
    const count = errors.length;
    let label = `${count} ${t('assessment_errors')}`;
    if (count === 0) label = t('error_log_empty');

    errContainer.innerHTML = `
      <button id="btn-toggle-errors" class="btn-toggle-errors ${count > 0 ? 'has-errors' : ''}">
        ${label} ${count > 0 ? (errorsExpanded ? '▲' : '▼') : ''}
      </button>
      <div id="ai-errors-list" class="ai-errors-list ${errorsExpanded && count > 0 ? 'open' : ''}">
        ${errors.map(e => `
          <div class="ai-error-item type-${e.type}">
            <span class="err-time">${e.timestamp.getHours().toString().padStart(2,'0')}:${e.timestamp.getMinutes().toString().padStart(2,'0')}</span>
            <span class="err-msg">${e.message}</span>
          </div>
        `).reverse().join('')}
      </div>
    `;

    el.appendChild(errContainer);

    const btn = errContainer.querySelector('#btn-toggle-errors');
    if (btn && count > 0) {
      btn.addEventListener('click', () => {
        errorsExpanded = !errorsExpanded;
        render(); // simple re-render
      });
    }
  }

  function updateTabIcon(status, hasReadings) {
    const tabIcon = document.getElementById('tab-status-icon');
    if (!tabIcon) return;
    
    if (status === 'analyzing' || status === 'processing') {
      tabIcon.textContent = '⏳';
    } else if (hasReadings) {
      if (status === 'ok') tabIcon.textContent = '✅';
      if (status === 'warning') tabIcon.textContent = '⚠️';
      if (status === 'critical') tabIcon.textContent = '🚨';
    } else {
      tabIcon.textContent = '⌛';
    }
  }

  state.addEventListener('change:aiAssessment', render);
  state.addEventListener('change:currentStatus', render);
  state.addEventListener('change:aiErrors', render);
  state.addEventListener('change:lang', render);
  render();
}
