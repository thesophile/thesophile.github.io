const container = document.getElementById('projects-container');

fetch('https://api.github.com/users/thesophile/repos', {
    headers: {
        'Accept': 'application/vnd.github.mercy-preview+json'
    }
})
    .then(res => res.json())
    .then(data => {
        if (!Array.isArray(data)) {
            container.innerHTML = 'Error loading projects';
            return;
        }

        // change this tag
        const TAG = 'portfolio';

        const repos = data
            .filter(repo => repo.topics && repo.topics.includes(TAG));

        if (repos.length === 0) {
            container.innerHTML = 'No tagged projects found';
            return;
        }

        repos.forEach(repo => {
            const div = document.createElement('div');
            div.className = 'border p-4 rounded';

            div.innerHTML = `
        <h3 class="font-semibold text-lg">${repo.name}</h3>
        <p class="text-sm text-gray-600 mt-2">${repo.description || 'No description'}</p>
        <a href="${repo.html_url}" target="_blank" class="inline-block mt-4 text-sm underline">View on GitHub</a>
      `;

            container.appendChild(div);
        });
    })
    .catch(() => {
        container.innerHTML = 'Failed to load projects';
    });


fetch('projects.json')
    .then(res => res.json())
    .then(projects => {
        const featuredEl = document.getElementById('featured-project');
        const gridEl = document.getElementById('projects-container');

        projects.forEach((p, i) => {
            const websiteLink = p.website
                ? `<a href="${p.website}" target="_blank" class="underline">Website</a> • `
                : '';
            const techTags = (p.tech || []).map(t =>
                `<span class="px-2 py-0.5 border rounded text-xs">${t}</span>`
            ).join('');

            if (i === 0) {
                // Full-width featured tile
                featuredEl.innerHTML = `
                    <div class="border rounded overflow-hidden flex flex-col md:flex-row">
                        <div class="relative w-full md:w-[60%] shrink-0 group">
                            <img src="${p.image}" class="w-full h-56 md:h-full object-cover" />
                            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                                ${p.website ? `<a href="${p.website}" target="_blank" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">Website</a>` : ''}
                                <a href="${p.repo}" target="_blank" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded">Repo</a>
                            </div>
                        </div>
                        <div class="p-6 flex flex-col justify-between flex-1">
                            <div>
                                <span class="text-xs border px-2 py-0.5 rounded uppercase tracking-wide">Featured</span>
                                <h3 class="mt-3 text-xl font-semibold">${p.title}</h3>
                                <p class="text-sm text-gray-600 mt-2">${p.desc}</p>
                                <ul class="mt-3 text-sm text-gray-700 list-disc list-inside space-y-1">
                                    ${(p.features || []).map(f => `<li>${f}</li>`).join('')}
                                </ul>
                            </div>
                            <div>
                                <div class="mt-4 flex flex-wrap gap-1">${techTags}</div>
                                <div class="mt-4 text-sm">
                                    ${websiteLink}<a href="${p.repo}" target="_blank" class="underline">Repo</a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Regular grid card
                const div = document.createElement('div');
                div.className = 'border rounded overflow-hidden flex flex-col';
                div.innerHTML = `
                    <img src="${p.image}" class="w-full h-40 object-cover" />
                    <div class="p-4 flex flex-col flex-1">
                        <h3 class="font-semibold">${p.title}</h3>
                        <p class="text-sm text-gray-600 mt-1 flex-1">${p.desc}</p>
                        <div class="mt-3 flex flex-wrap gap-1">${techTags}</div>
                        <div class="mt-3 text-sm">
                            ${websiteLink}<a href="${p.repo}" target="_blank" class="underline">Repo</a>
                        </div>
                    </div>
                `;
                gridEl.appendChild(div);
            }
        });
    })
    .catch(() => {
        document.getElementById('featured-project').innerHTML = 'Failed to load projects';
    });