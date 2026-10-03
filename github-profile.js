'use strict';

(() => {
  const section = document.querySelector('.github-profile');
  const status = document.getElementById('github-status');
  const details = document.getElementById('github-details');
  const retry = document.getElementById('github-retry');
  const form = document.getElementById('github-search');
  const query = document.getElementById('github-query');
  const results = document.getElementById('github-results');
  const link = document.getElementById('github-link');
  let lastRequest;
  let activeController;

  async function request(endpoint, render) {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    lastRequest = () => request(endpoint, render);


    section.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading from GitHub…';
    retry.hidden = true;
    details.hidden = true;
    link.hidden = true;
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal
      });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new Error('GitHub is limiting requests or denying access. Please try again later.');
        }
        if (response.status === 422) throw new Error('GitHub could not understand this search query. Try a different query.');
        if (response.status === 404) throw new Error('This GitHub profile could not be found.');
        throw new Error(`GitHub could not load the profile (HTTP ${response.status}).`);
      }
      const data = await response.json();
      if (activeController !== controller) return;
      render(data);
    } catch (error) {
      if (activeController !== controller) return;
      status.textContent = error.name === 'AbortError'
        ? 'GitHub took too long to respond. Please try again.'
        : error instanceof TypeError
          ? 'Unable to reach GitHub. Check your connection and try again.'
          : error.message;
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (activeController === controller) section.setAttribute('aria-busy', 'false');
    }
  }

  function loadProfile(login) {
    request(`https://api.github.com/users/${encodeURIComponent(login)}`, profile => {
      if (typeof profile.login !== 'string') throw new Error('GitHub returned an unexpected profile.');
      document.getElementById('github-name').textContent = profile.name || profile.login;
      document.getElementById('github-bio').textContent = profile.bio || 'No bio shared yet.';
      document.getElementById('github-stats').textContent =
        `${profile.public_repos ?? 0} public repositories · ${profile.followers ?? 0} followers · ${profile.following ?? 0} following`;
      const avatar = document.getElementById('github-avatar');
      const avatarUrl = new URL(profile.avatar_url);
      if (avatarUrl.protocol !== 'https:') throw new Error('GitHub returned an invalid avatar URL.');
      avatar.src = avatarUrl.href;
      avatar.alt = `${profile.login}'s GitHub avatar`;
      link.href = `https://github.com/${encodeURIComponent(profile.login)}`;
      link.hidden = false;
      details.hidden = false;
      status.textContent = `Profile loaded for ${profile.login}.`;
    });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const search = query.value.trim();
    if (!search) {
      query.setCustomValidity('Enter a username or search query.');
      query.reportValidity();
      return;
    }
    results.replaceChildren();
    const params = new URLSearchParams({ q: search, per_page: '10' });
    request(`https://api.github.com/search/users?${params}`, data => {
      if (!Array.isArray(data.items)) throw new Error('GitHub returned unexpected search results.');
      const fragment = document.createDocumentFragment();
      data.items.forEach(user => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary';
        button.textContent = user.login;
        button.addEventListener('click', () => loadProfile(user.login));
        item.appendChild(button);
        fragment.appendChild(item);
      });
      results.replaceChildren(fragment);
      status.textContent = data.items.length
        ? `Showing ${data.items.length} of ${data.total_count} matching users. Select a user to view their profile.${data.incomplete_results ? ' GitHub returned partial results.' : ''}`
        : 'No users found. Try a different search.';
    });
  });
  query.addEventListener('input', () => query.setCustomValidity(''));
  retry.addEventListener('click', () => lastRequest?.());
})();
