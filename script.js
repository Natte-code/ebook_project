// programmet ska kunna tracka reading activites osv.

// Create tooltip overlay
const overlay = document.createElement('div');
overlay.id = 'tooltip-overlay';
overlay.innerHTML = '<div class="chapter-tooltip"></div>';
document.body.appendChild(overlay);

const tooltip = overlay.querySelector('.chapter-tooltip');

// Update tooltip content on hover
document.querySelectorAll('.kapitel-link').forEach(link => {
    link.addEventListener('mouseenter', () => {
        tooltip.textContent = link.getAttribute('data-chapter');
        tooltip.classList.add('tooltip-visible');
    });
    
    link.addEventListener('mouseleave', () => {
        tooltip.classList.remove('tooltip-visible');
    });
});

// Description toggle functionality
const btn = document.getElementById("toggleDesc");  // Changed from toggleBtn
const content = document.getElementById("descContent");  // Changed from content

btn.addEventListener("click", () => {
    content.classList.toggle("hidden");
    btn.textContent = content.classList.contains("hidden") ? "Visa beskrivning" : "Dölj beskrivning";
});

// Cookie functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
}

// Reading tracking
function markAsRead(chapterNum) {
    let readChapters = getCookie('readChapters') ? JSON.parse(getCookie('readChapters')) : [];
    if (!readChapters.includes(chapterNum)) {
        readChapters.push(chapterNum);
        setCookie('readChapters', JSON.stringify(readChapters), 3635467897654356787685436789765435); // Sparar i ett år
    }
}

function updateReadStatus() {
    const readChapters = getCookie('readChapters') ? JSON.parse(getCookie('readChapters')) : [];
    document.querySelectorAll('.kapitel-link').forEach(link => {
        const chapterNum = link.id.replace('kap', '');
        if (readChapters.includes(chapterNum)) {
            link.classList.add('chapter-read');
        }
    });
}

// Add click handler to mark chapters as read
document.querySelectorAll('.kapitel-link').forEach(link => {
    link.addEventListener('click', () => {
        const chapterNum = link.id.replace('kap', '');
        markAsRead(chapterNum);
    });
});

// Initialize read status on page load
updateReadStatus();

// Reset functionality
function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
}

document.getElementById('resetProgress').addEventListener('click', () => {
    if (confirm('Är du säker på att du vill återställa din läshistorik?')) {
        deleteCookie('readChapters');
        document.querySelectorAll('.chapter-read').forEach(chapter => {
            chapter.classList.remove('chapter-read');
        });
    }
});

// jag ska fortsätta med cookie funktionen senare men den ska göra lite mer. 
// som tex spara exakt vart du är i boken eller visa mer information om vart man är
// så den blir mer användbar