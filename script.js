const PROJECTS_PER_PAGE = 6;
let allGridCards = [];
let gridShown = 0;

function resolveImage(img, repoUrl) {
    const match = repoUrl && repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    const githubThumb = match
        ? `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/thumbnail/thumbnail.webp`
        : null;

    const imgEl = document.createElement('img');
    imgEl.className = 'w-full h-40 object-cover bg-gray-100';

    const fallbacks = [];
    if (img) fallbacks.push(img);
    if (githubThumb) fallbacks.push(githubThumb);
    fallbacks.push('img/project_placeholder.webp');

    let attempt = 0;

    imgEl.dataset.fallbacks = JSON.stringify(fallbacks);
    imgEl.dataset.attempt = '0';

    return imgEl;
}

function activateImage(imgEl) {
    const fallbacks = JSON.parse(imgEl.dataset.fallbacks);
    let attempt = parseInt(imgEl.dataset.attempt);

    function tryNext() {
        attempt++;
        if (attempt < fallbacks.length) {
            imgEl.src = fallbacks[attempt];
        }
    }

    imgEl.onerror = tryNext;
    imgEl.onload = function () {
        if (this.naturalWidth === 0) tryNext();
    };

    imgEl.src = fallbacks[attempt];
}

function makeGridCard(title, desc, imageUrl, websiteUrl, repoUrl, techList = []) {
    const websiteBtn = websiteUrl
        ? `<a href="${websiteUrl}" target="_blank" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">Website</a>`
        : '';
    const repoBtn = repoUrl
        ? `<a href="${repoUrl}" target="_blank" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">Repo</a>`
        : '';
    const techTags = techList.map(t =>
        `<span class="px-2 py-0.5 border rounded text-xs">${t}</span>`
    ).join('');
    const websiteLink = websiteUrl
        ? `<a href="${websiteUrl}" target="_blank" class="underline">Website</a> • `
        : '';
    const repoLink = repoUrl
        ? `<a href="${repoUrl}" target="_blank" class="underline">Repo</a>`
        : '';

    const div = document.createElement('div');
    div.className = 'border rounded overflow-hidden flex flex-col';

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'relative group';
    imageWrapper.innerHTML = `
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-10">
            ${websiteBtn}${repoBtn}
        </div>
    `;
    imageWrapper.prepend(resolveImage(imageUrl, repoUrl));

    const infoDiv = document.createElement('div');
    infoDiv.className = 'p-4 flex flex-col flex-1';
    infoDiv.innerHTML = `
        <h3 class="font-semibold">${title}</h3>
        <p class="text-sm text-gray-600 mt-1 flex-1">${desc}</p>
        ${techTags ? `<div class="mt-3 flex flex-wrap gap-1">${techTags}</div>` : ''}
        <div class="mt-3 text-sm">${websiteLink}${repoLink}</div>
    `;

    div.appendChild(imageWrapper);
    div.appendChild(infoDiv);
    return div;
}

function renderGridBatch() {
    const gridEl = document.getElementById('projects-container');
    const btn = document.getElementById('projects-more-btn');
    const batch = allGridCards.slice(gridShown, gridShown + PROJECTS_PER_PAGE);
    batch.forEach(card => {
        gridEl.appendChild(card);
        card.querySelectorAll('img[data-fallbacks]').forEach(activateImage);
    });
    gridShown += batch.length;
    if (btn) btn.classList.toggle('hidden', gridShown >= allGridCards.length);
}

// Fetch projects.json (featured tile + first grid cards)
// Then fetch GitHub repos and append to grid
Promise.all([
    fetch('projects.json').then(r => r.json()),
    fetch('https://api.github.com/users/thesophile/repos', {
        headers: { 'Accept': 'application/vnd.github.mercy-preview+json' }
    }).then(r => r.json()).catch(() => [])
]).then(([projects, githubRepos]) => {
    const featuredEl = document.getElementById('featured-project');

    // --- Featured tile (first item in projects.json) ---
    const fp = projects[0];
    if (fp) {
        const techTags = (fp.tech || []).map(t =>
            `<span class="px-2 py-0.5 border rounded text-xs">${t}</span>`
        ).join('');
        featuredEl.innerHTML = `
            <div class="border rounded overflow-hidden flex flex-col md:flex-row">
                <div class="relative w-full md:w-[60%] shrink-0 group">
                    <img src="${fp.image}" class="w-full h-56 md:h-full object-cover" />
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                        ${fp.website ? `<a href="${fp.website}" target="_blank" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">Website</a>` : ''}
                        <a href="${fp.repo}" target="_blank" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">Repo</a>
                    </div>
                </div>
                <div class="p-6 flex flex-col justify-between flex-1">
                    <div>
                        <span class="text-xs border px-2 py-0.5 rounded uppercase tracking-wide">Featured</span>
                        <h3 class="mt-3 text-xl font-semibold">${fp.title}</h3>
                        <p class="text-sm text-gray-600 mt-2">${fp.desc}</p>
                        <ul class="mt-3 text-sm text-gray-700 list-disc list-inside space-y-1">
                            ${(fp.features || []).map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <div class="mt-4 flex flex-wrap gap-1">${techTags}</div>
                        <div class="mt-4 text-sm">
                            ${fp.website ? `<a href="${fp.website}" target="_blank" class="underline">Website</a> • ` : ''}
                            <a href="${fp.repo}" target="_blank" class="underline">Repo</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Grid: remaining projects.json items first ---
    projects.slice(1).forEach(p => {
        allGridCards.push(makeGridCard(p.title, p.desc, p.image, p.website, p.repo, p.tech));
    });

    // --- Grid: GitHub repos tagged 'portfolio', skip ones already in projects.json ---
    const TAG = 'portfolio';
    const existingRepos = new Set(projects.map(p => p.repo));
    if (Array.isArray(githubRepos)) {
        githubRepos
            .filter(r => r.topics && r.topics.includes(TAG) && !existingRepos.has(r.html_url))
            .forEach(r => {
                allGridCards.push(makeGridCard(
                    r.name,
                    r.description || 'No description',
                    null,
                    r.homepage || null,
                    r.html_url,
                    []
                ));
            });
    }

    renderGridBatch();

    const btn = document.getElementById('projects-more-btn');
    if (btn) btn.addEventListener('click', renderGridBatch);

}).catch(() => {
    document.getElementById('featured-project').innerHTML = 'Failed to load projects';
});