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


let index = 0;
const slider = document.getElementById('slider');

function getVisibleCards() {
    if (window.innerWidth >= 1024) return 3; // lg
    if (window.innerWidth >= 768) return 2;  // md
    return 1;
}

function getMaxIndex() {
    const total = slider.children.length;
    const visible = getVisibleCards();
    return Math.max(0, total - visible);
}

function update() {
    slider.style.transform = `translateX(-${index * (100 / getVisibleCards())}%)`;
}

function next() {
    const max = getMaxIndex();
    if (index < max) {
        index++;
    } else {
        index = 0; // loop back
    }
    update();
}

function prev() {
    const max = getMaxIndex();
    if (index > 0) {
        index--;
    } else {
        index = max;
    }
    update();
}

// reset on resize (important)
window.addEventListener('resize', () => {
    index = 0;
    update();
});

// auto slide (safe)
setInterval(() => {
    next();
}, 4000);


fetch('projects.json')
    .then(res => res.json())
    .then(projects => {

        projects.forEach(p => {
            const div = document.createElement('div');
            div.className = "min-w-full md:min-w-[50%] lg:min-w-[33.33%] p-2";

            div.innerHTML = `
        <div class="border rounded p-4">
          <img src="${p.image}" class="w-full h-40 object-cover rounded" />
          <h3 class="mt-3 font-semibold">${p.title}</h3>
          <p class="text-sm text-gray-600 mt-1">${p.desc}</p>
          <div class="mt-2 text-sm">
            <a href="${p.website}" class="underline">Website</a> •
            <a href="${p.repo}" class="underline">Repo</a>
          </div>
        </div>
      `;

            slider.appendChild(div);
        });

    })
    .catch(() => {
        slider.innerHTML = "Failed to load projects";
    });