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
        let chapterNum = link.getAttribute('data-chapter');
        let title = link.getAttribute('data-chapter-title') || '';
        let tooltipText = '';
        // Om kapiteldata är laddad, använd dess titel om möjligt
        let realTitle = (typeof allChapters === 'object' && allChapters[chapterNum] && allChapters[chapterNum].title)
            ? allChapters[chapterNum].title
            : title;
        // Undvik dubbelt "Kapitel" om titeln redan börjar med det
        if (realTitle && realTitle.trim().toLowerCase().startsWith('kapitel')) {
            tooltipText = realTitle;
        } else if (realTitle) {
            tooltipText = `Kapitel ${chapterNum}: ${realTitle}`;
        } else {
            tooltipText = `Kapitel ${chapterNum}: COMING SOON`;
        }
        tooltip.textContent = tooltipText;
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

// Ta bort all cookie-hantering och statuslagring
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

// Helpers for cookies (JSON)
function setCookieObj(name, obj, days) {
    try {
        setCookie(name, JSON.stringify(obj), days);
    } catch (e) {
        // fallback: rensa
        setCookie(name, '{}', days);
    }
}
function getCookieObj(name) {
    const val = getCookie(name);
    if (!val) return {};
    try {
        const parsed = JSON.parse(val);
        // Endast objekt accepteras
        if (typeof parsed === 'object' && parsed !== null) return parsed;
        return {};
    } catch {
        // Om det är gammalt format eller trasigt, rensa
        setCookie(name, '{}', 365);
        return {};
    }
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

// Status: unread, reading, read
function setStatus(num, status) {
    const stat = getChapterStatus();
    stat[num] = status;
    setChapterStatus(stat);
}
function getStatus(num) {
    const stat = getChapterStatus();
    return stat[num] || "unread";
}

// Bookmark: store both selected text and optional label
function setBookmark(num, selectedText, label) {
    if (!selectedText) return; // Spara aldrig tomma bokmärken
    const bm = getBookmarks();
    bm[num] = { selectedText, label, time: Date.now() };
    setBookmarks(bm);
}
function getBookmark(num) {
    const bm = getBookmarks();
    // Endast visa bokmärken som har markerad text
    if (bm[num] && bm[num].selectedText) return bm[num];
    return null;
}

// Notes
function setNote(num, note) {
    const notes = getNotes();
    notes[num] = note;
    setNotes(notes);
}
function getNote(num) {
    const notes = getNotes();
    return notes[num] || "";
}

// Lässtatus och bokmärken/notes
function getChapterStatus() {
    return getCookieObj('chapterStatus');
}
function setChapterStatus(statusObj) {
    setCookieObj('chapterStatus', statusObj, 365);
}
function getBookmarks() {
    return getCookieObj('chapterBookmarks');
}
function setBookmarks(obj) {
    setCookieObj('chapterBookmarks', obj, 365);
}
function getNotes() {
    return getCookieObj('chapterNotes');
}
function setNotes(obj) {
    setCookieObj('chapterNotes', obj, 365);
}

// Modifiera updateReadStatus till updateChapterStatus
function updateChapterStatus(currentOpenChapterNum = null) {
    const stat = getChapterStatus();
    document.querySelectorAll('.kapitel-link').forEach(link => {
        const chapterNum = link.getAttribute('data-chapter');
        link.classList.remove('chapter-read', 'chapter-reading', 'chapter-unread', 'chapter-disabled');
        // Failsafe: Hantera kapitel som inte är tillgängliga
        if (!isChapterAvailable(chapterNum)) {
            link.classList.add('chapter-unread', 'chapter-disabled');
            link.style.opacity = "0.5";
            link.style.pointerEvents = "none";
            return;
        } else {
            link.classList.remove('chapter-disabled');
            link.style.opacity = "";
            link.style.pointerEvents = "";
        }
        // Endast markerade kapitel får "read"
        if (stat[chapterNum] === "read") {
            link.classList.add('chapter-read');
        } else if (currentOpenChapterNum && chapterNum === currentOpenChapterNum) {
            link.classList.add('chapter-reading');
        } else {
            link.classList.add('chapter-unread');
        }
    });
    updateProgressBar(); // Lägg till denna rad om den saknas
}

// Add click handler to mark chapters as reading (endast om kapitel finns)
document.querySelectorAll('.kapitel-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const chapterNum = link.getAttribute('data-chapter');
        // Failsafe: Blockera kapitel som inte är tillgängliga
        if (!isChapterAvailable(chapterNum)) {
            showPopup('Detta kapitel är inte tillgängligt än.');
            return;
        }
        if (!chaptersLoaded) {
            showPopup('Kapiteldata laddas, vänta ett ögonblick...');
            return;
        }
        loadChapter(chapterNum);
        manualStatus[chapterNum] = "reading";
        updateManualChapterStatus();
    });
});

// Reset functionality
function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
}

// Reset ALL cookie data (read, bookmarks, notes, status)
function resetAllCookies() {
    deleteCookie('readChapters');
    deleteCookie('chapterBookmarks');
    deleteCookie('chapterNotes');
    deleteCookie('chapterStatus');
    deleteCookie('chapterSessionStatus'); // Viktigt: nollställ även sessionstatus
    // Rensa visuellt
    document.querySelectorAll('.chapter-read, .chapter-reading, .chapter-unread').forEach(chapter => {
        chapter.classList.remove('chapter-read', 'chapter-reading', 'chapter-unread');
    });
    showPopup('All läshistorik, bokmärken och noteringar har återställts!');
    updateChapterStatus();
    updateManualChapterStatus();
    updateProgressBar(); // Säkerställ att progressbar alltid nollställs
}

document.getElementById('resetProgress').addEventListener('click', () => {
    if (confirm('Är du säker på att du vill återställa all läshistorik, bokmärken och noteringar?')) {
        resetAllCookies();
    }
});

//skaffar elementen
const popup = document.getElementById("popup");
const message = popup.querySelector(".popup-message");
const closeBtn = popup.querySelector(".popup-close"); // Lägg till denna rad

// Lägg till event listener för stäng-knappen
closeBtn.addEventListener("click", hidePopup);

function showPopup(text){
    message.textContent = text;
    lastFocusedElement = document.activeElement;
    popup.classList.add("show");
    popup.setAttribute('aria-live', 'assertive');
    setTimeout(() => {
        // Sätt fokus på popupen eller stäng-knappen
        (popup.querySelector('.popup-close') || popup).focus?.();
    }, 50);
    setTimeout(() => popup.classList.remove("show"), text.includes("återställts") ? 5000 : 3500);
}

function hidePopup(){
    popup.classList.remove("show");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        setTimeout(() => lastFocusedElement.focus(), 100);
    }
}

//how should i trigger the popup?
// i think i should trigger it when the user first visits the page
window.addEventListener("load", () => {
    // Visa popup endast om den inte redan visats denna session
    if (!sessionStorage.getItem('cookiePopupShown')) {
        showPopup("Denna websida använder cookies för att spara läs-data. (Tryck på Återställ läshistorik) om du inte vill ha några kakor");
        sessionStorage.setItem('cookiePopupShown', '1');
    }
});

// Kapitelhantering
const chapterContent = document.getElementById('chapter-content');
const chapterText = chapterContent.querySelector('.chapter-text');
const backButton = chapterContent.querySelector('.back-to-list');

// Dölj/visa rätt sektioner vid kapitelvisning
function showChapterView() {
    document.getElementById('desc').style.display = 'none';
    document.getElementById('share').style.display = 'none';
    document.getElementById('kap').style.display = 'none';
    document.querySelector('.contact-footer').style.display = 'none';
    chapterContent.classList.remove('hidden');
}
function showListView() {
    stopChapterTimer();
    document.getElementById('desc').style.display = 'block';
    document.getElementById('share').style.display = 'block';
    document.getElementById('kap').style.display = 'block';
    document.querySelector('.contact-footer').style.display = 'block';
    chapterContent.classList.add('hidden');
    // Rensa sökfält och visa alla kapitel
    const search = document.getElementById('chapterSearchInput');
    if (search) {
        search.value = '';
        document.querySelectorAll('.kapitel-link').forEach(link => link.style.display = '');
    }
}

// === LADDNINGSINDIKATOR ===
const loadingIndicator = document.getElementById('loading-indicator');
function showLoading() {
    loadingIndicator.classList.add('active');
}
function hideLoading() {
    loadingIndicator.classList.remove('active');
}

// === MÖRKT LÄGE ===
const darkModeToggle = document.getElementById('darkModeToggle');
function setDarkMode(on, updateIcon = true) {
    if (on) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', '1');
        if (updateIcon) darkModeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', '0');
        if (updateIcon) darkModeToggle.textContent = '🌙';
    }
}

// Initiera dark mode korrekt vid sidladdning
(function() {
    const darkPref = localStorage.getItem('darkMode');
    if (darkPref === '1') {
        setDarkMode(true, true);
    } else {
        setDarkMode(false, true);
    }
})();

darkModeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    setDarkMode(!isDark, true);
});

// === PROGRESSBAR ===
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const total = document.querySelectorAll('.kapitel-link').length;
    let read = 0;
    try {
        const session = getChapterSessionStatus();
        for (const k in session) if (session[k] === "read") read++;
    } catch {}
    progressBar.style.width = total ? (100 * read / total) + '%' : '0%';
    // Visa även text (t.ex. "3/10 kapitel lästa")
    if (progressText) {
        progressText.textContent = `${read}/${total} kapitel lästa`;
    }
}
window.updateProgressBar = updateProgressBar;

// === KAPITELBESKRIVNING I KAPITELVY ===
function setChapterDescription(num) {
    const descDiv = document.querySelector('.chapter-description');
    let desc = '';
    if (typeof allChapters === 'object' && allChapters[num] && allChapters[num].title) {
        desc = allChapters[num].title;
    } else {
        // Fallback till data-chapter-title
        const link = document.querySelector(`.kapitel-link[data-chapter="${num}"]`);
        desc = link ? link.getAttribute('data-chapter-title') : '';
    }
    descDiv.textContent = desc ? desc : '';
}

// === Ladda kapiteldata med indikator ===
let allChapters = {};
let chaptersLoaded = false;
showLoading();
fetch('chapters/chapters.json')
    .then(res => res.json())
    .then(data => {
        allChapters = data.chapters || {};
        chaptersLoaded = true;
        hideLoading();
        updateManualChapterStatus();
        updateProgressBar();
    })
    .catch(() => {
        showPopup('Kunde inte ladda kapiteldata. Kontrollera din internetanslutning eller filen chapters.json.');
        allChapters = {};
        chaptersLoaded = false;
        hideLoading();
        updateManualChapterStatus();
        updateProgressBar();
    });

// Vänta tills kapiteldata är laddad innan klick fungerar
document.querySelectorAll('.kapitel-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (!chaptersLoaded) {
            showPopup('Kapiteldata laddas, vänta ett ögonblick...');
            return;
        }
        const chapterNum = link.getAttribute('data-chapter');
        loadChapter(chapterNum);
        markAsRead(chapterNum);
        link.classList.add('chapter-read');
    });
});

// Helper: scrolla mjukt till position i element
function smoothScrollTo(element, pos) {
    element.scrollTo({ top: pos, behavior: "smooth" });
}

// Helper: markera bokmärkesrad i texten (baserat på scrollTop)
function highlightBookmark(contentDiv, pos) {
    let marker = contentDiv.querySelector('.bookmark-highlight');
    if (!marker) {
        marker = document.createElement('div');
        marker.className = 'bookmark-highlight';
        marker.style.position = 'absolute';
        marker.style.left = 0;
        marker.style.right = 0;
        marker.style.height = '30px';
        marker.style.background = 'rgba(255,230,0,0.25)';
        marker.style.pointerEvents = 'none';
        marker.style.zIndex = 2;
        contentDiv.appendChild(marker);
    }
    marker.style.top = (pos - contentDiv.scrollTop) + 'px';
    marker.style.display = 'block';
    setTimeout(() => { marker.style.display = 'none'; }, 2500);
}

// Helper: hämta textutdrag på bokmärkespositionen
function getBookmarkExcerpt(contentDiv, pos) {
    // Hitta det element (rad) som är närmast scrollTop
    let nodes = Array.from(contentDiv.childNodes);
    let closest = null;
    let minDist = Infinity;
    nodes.forEach(node => {
        if (node.nodeType === 1 || node.nodeType === 3) {
            let rect = node.getBoundingClientRect();
            let dist = Math.abs((contentDiv.scrollTop + 15) - (node.offsetTop || 0));
            if (dist < minDist) {
                minDist = dist;
                closest = node;
            }
        }
    });
    if (closest) {
        let text = closest.textContent || '';
        return text.trim().slice(0, 80);
    }
    return '';
}

// Robust kontroll om kapitel är tillgängligt
function isChapterAvailable(chapterNum) {
    if (!allChapters || !allChapters[chapterNum]) return false;
    const ch = allChapters[chapterNum];
    // Tillåt kapitel om det finns någon text eller titel och titeln inte är "COMING SOON"
    if ((ch.content && ch.content.trim() !== "") || (ch.title && ch.title.trim() !== "" && ch.title !== "COMING SOON")) {
        return true;
    }
    return false;
}

// === LÄSTID PER KAPITEL ===
let chapterOpenTime = null;
let currentOpenChapter = null;
function startChapterTimer(num) {
    chapterOpenTime = Date.now();
    currentOpenChapter = num;
}
function stopChapterTimer() {
    if (!chapterOpenTime || !currentOpenChapter) return;
    const elapsed = Math.floor((Date.now() - chapterOpenTime) / 1000); // sekunder
    const times = getReadTimes();
    times[currentOpenChapter] = (times[currentOpenChapter] || 0) + elapsed;
    setReadTimes(times);
    chapterOpenTime = null;
    currentOpenChapter = null;
}
function getReadTimes() {
    return getCookieObj('chapterReadTimes');
}
function setReadTimes(obj) {
    setCookieObj('chapterReadTimes', obj, 365);
}

// Koppla timer till kapitelvisning
async function loadChapter(num) {
    stopChapterTimer();
    startChapterTimer(num);
    try {
        // Failsafe: Kontrollera kapiteldata
        if (!isChapterAvailable(num)) {
            showPopup('Detta kapitel är inte tillgängligt än.');
            return;
        }
        const chapter = allChapters[num];
        if (!chapter) {
            showPopup('Kunde inte hitta kapiteldata.');
            return;
        }

        showChapterView();
        setChapterDescription(num);

        // Hämta alltid senaste bokmärkesdata
        let bookmarkObj = getBookmark(num);
        let bookmarkText = bookmarkObj ? bookmarkObj.selectedText : '';
        let bookmarkLabel = bookmarkObj ? (bookmarkObj.label || '') : '';
        let bookmarkTime = bookmarkObj ? bookmarkObj.time : null;
        const note = getNote(num);
        const session = getChapterSessionStatus();
        // Statuspanel: två checkboxar
        let statusPanel = `
            <div style="background:#f7f7f7;padding:10px 0 10px 0;margin-bottom:10px;border-radius:6px;">
                <label style="margin-right:24px;">
                    <input type="checkbox" id="readingCheckbox" ${session[num] === "reading" ? "checked" : ""}>
                    Jag läser detta kapitel
                </label>
                <label>
                    <input type="checkbox" id="readCheckbox" ${session[num] === "read" ? "checked" : ""}>
                    Jag har läst klart detta kapitel
                </label>
            </div>
        `;

        // Bokmärkesinfo med utdrag
        let bookmarkInfo = '';
        if (bookmarkObj && bookmarkText) {
            const date = new Date(bookmarkTime);
            bookmarkInfo = `
                <div style="color:#666;font-size:0.95em;margin-bottom:4px;">
                    Bokmärke satt ${date.toLocaleString()}${bookmarkLabel ? ` – <b>${bookmarkLabel}</b>` : ""}
                    <span style="margin-left:10px;color:#b00;cursor:pointer;" id="removeBookmarkBtn">Ta bort bokmärke</span>
                    <br>
                    <span style="font-size:0.93em;color:#888;">
                        Utdrag: <span class="bookmark-saved-text" style="background: #fffbe6; border-radius: 3px; padding: 1px 4px;">${bookmarkText}</span>
                    </span>
                </div>`;
        } else {
            bookmarkInfo = `<div style="color:#888;font-size:0.95em;margin-bottom:4px;">Inga bokmärken satta</div>`;
        }

        let bookmarkPanel = `
            <div style="background:#f7f7f7;padding:10px 0 10px 0;margin-bottom:10px;border-radius:6px;position:relative;">
                ${bookmarkInfo}
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <button id="saveSelectionBookmarkBtn">Spara markerad text som bokmärke</button>
                    ${bookmarkObj && bookmarkText ? `<button id="gotoBookmarkBtn">Gå till bokmärke</button>` : ""}
                    <input type="text" id="bookmarkLabelInput" value="${bookmarkLabel}" style="width:180px;" placeholder="Bokmärkesnamn (valfritt)">
                </div>
            </div>
        `;

        let notePanel = `
            <div style="background:#f7f7f7;padding:10px 0 10px 0;margin-bottom:10px;border-radius:6px;">
                <label><strong>Dina noteringar:</strong></label><br>
                <textarea id="noteInput" style="width:60%;height:40px;margin-top:8px;" placeholder="Skriv en notering...">${note}</textarea>
                <button id="saveNoteBtn" style="margin-left:10px;">Spara notering</button>
            </div>
        `;

        // Bygg kapiteltexten som <div>s per rad för exakt positionering
        const lines = (chapter.content || '').split('\n');
        let chapterHtml = '';
        lines.forEach(line => {
            chapterHtml += `<div class="chapter-line">${line === '' ? '&nbsp;' : line}</div>`;
        });

        chapterText.innerHTML = `
            ${statusPanel}
            ${bookmarkPanel}
            ${notePanel}
            <h1>${chapter.title ? chapter.title : 'Kapitel'}</h1>
            <div class="chapter-content" id="chapter-content-text" style="max-height:60vh;overflow-y:auto;position:relative;">${chapterHtml}</div>
        `;

        const contentDiv = document.getElementById('chapter-content-text');

        // Spara markerad text som bokmärke
        document.getElementById('saveSelectionBookmarkBtn').onclick = () => {
            const selection = window.getSelection();
            let selectedText = selection && selection.toString().trim();
            if (!selectedText) {
                showPopup('Markera text i kapitlet först!');
                return;
            }
            const label = document.getElementById('bookmarkLabelInput').value;
            setBookmark(num, selectedText, label);
            showPopup('Bokmärke sparat!');
            loadChapter(num); // Uppdatera panelen direkt
        };

        // Gå till bokmärke: scrolla till första förekomsten och markera (förbättrad)
        if (bookmarkObj && bookmarkText && document.getElementById('gotoBookmarkBtn')) {
            document.getElementById('gotoBookmarkBtn').onclick = () => {
                // Hämta senaste bokmärkesdata
                const bm = getBookmark(num);
                const text = bm && bm.selectedText;
                if (!text) return;
                const lines = Array.from(contentDiv.querySelectorAll('.chapter-line'));
                let found = false;
                let bestLine = null;
                let bestIndex = -1;
                let bestPos = Infinity;
                // Försök hitta exakt match, annars närmaste substring
                for (let i = 0; i < lines.length; i++) {
                    const lineText = lines[i].textContent;
                    if (lineText === text) {
                        bestLine = lines[i];
                        bestIndex = i;
                        bestPos = 0;
                        break;
                    } else if (lineText.includes(text)) {
                        // Om substring, välj första och närmast början
                        const pos = lineText.indexOf(text);
                        if (pos < bestPos) {
                            bestLine = lines[i];
                            bestIndex = i;
                            bestPos = pos;
                        }
                    }
                }
                // Ta bort tidigare highlights
                lines.forEach(line => {
                    line.classList.remove('bookmark-highlight-line');
                    // Ta bort eventuell highlight-span
                    line.innerHTML = line.innerHTML.replace(/<span class="bm-jump-highlight">([\s\S]*?)<\/span>/g, '$1');
                });
                if (bestLine) {
                    // Lägg till tydlig bakgrund på raden
                    bestLine.classList.add('bookmark-highlight-line');
                    // Markera själva texten i raden om substring
                    if (bestPos > -1) {
                        let html = bestLine.innerHTML;
                        // Undvik att markera flera gånger
                        html = html.replace(/<span class="bm-jump-highlight">([\s\S]*?)<\/span>/g, '$1');
                        // Markera första förekomsten (case-insensitive)
                        const safeText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        html = html.replace(new RegExp(safeText, 'i'), `<span class="bm-jump-highlight" style="background:#ffe066;color:#222;border-radius:2px;padding:0 2px;">$&</span>`);
                        bestLine.innerHTML = html;
                    }
                    // Scrolla till raden och centrera
                    bestLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Lägg till en extra visuell indikator till vänster (t.ex. pil)
                    if (!bestLine.querySelector('.bm-jump-arrow')) {
                        const arrow = document.createElement('span');
                        arrow.className = 'bm-jump-arrow';
                        arrow.textContent = '➤';
                        arrow.style.color = '#e6b800';
                        arrow.style.fontWeight = 'bold';
                        arrow.style.marginRight = '8px';
                        bestLine.prepend(arrow);
                        setTimeout(() => {
                            if (arrow.parentNode) arrow.parentNode.removeChild(arrow);
                        }, 2500);
                    }
                    setTimeout(() => {
                        bestLine.classList.remove('bookmark-highlight-line');
                        // Ta bort highlight och pil efter 2.5s
                        bestLine.innerHTML = bestLine.innerHTML.replace(/<span class="bm-jump-highlight"[^>]*>([\s\S]*?)<\/span>/g, '$1');
                        const arrow = bestLine.querySelector('.bm-jump-arrow');
                        if (arrow) arrow.remove();
                    }, 2500);
                    showPopup('Hoppade till bokmärke!');
                } else {
                    showPopup('Kunde inte hitta bokmärket i texten.');
                }
            };
        }

        // Ta bort bokmärke
        if (bookmarkObj && document.getElementById('removeBookmarkBtn')) {
            document.getElementById('removeBookmarkBtn').onclick = () => {
                const bm = getBookmarks();
                delete bm[num];
                setBookmarks(bm);
                showPopup('Bokmärke borttaget!');
                loadChapter(num); // Uppdatera panelen direkt
            };
        }

        // Spara/uppdatera bokmärkesnamn utan att ändra markerad text
        document.getElementById('bookmarkLabelInput').addEventListener('change', () => {
            // Hämta senaste bokmärkesdata
            const bm = getBookmark(num);
            const label = document.getElementById('bookmarkLabelInput').value;
            if (bm && bm.selectedText) {
                setBookmark(num, bm.selectedText, label);
                showPopup('Bokmärkesnamn sparat!');
                loadChapter(num); // Uppdatera panelen direkt
            }
        });

        // Event för notering
        document.getElementById('saveNoteBtn').onclick = () => {
            const val = document.getElementById('noteInput').value;
            setNote(num, val);
            showPopup('Notering sparad!');
        };
        // Event för status-checkboxar
        document.getElementById('readingCheckbox').onchange = (e) => {
            if (e.target.checked) {
                setChapterSessionStatus(num, "reading");
                document.getElementById('readCheckbox').checked = false;
            } else if (!document.getElementById('readCheckbox').checked) {
                setChapterSessionStatus(num, undefined);
            }
            updateManualChapterStatus();
        };
        document.getElementById('readCheckbox').onchange = (e) => {
            if (e.target.checked) {
                setChapterSessionStatus(num, "read");
                document.getElementById('readingCheckbox').checked = false;
            } else if (!document.getElementById('readingCheckbox').checked) {
                setChapterSessionStatus(num, undefined);
            }
            updateManualChapterStatus();
        };

        updateManualChapterStatus();
        updateProgressBar();
        history.pushState({chapter: num}, '', `#kapitel-${num}`);
    } catch (error) {
        console.error('Failed to load chapter:', error);
        showPopup('Kunde inte ladda kapitlet. Kontrollera kapiteldata.');
    }
}

// Lägg till stöd för bakåtnavigering
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.chapter) {
        loadChapter(event.state.chapter);
    } else {
        showListView();
    }
});

backButton.addEventListener('click', () => {
    showListView();
    history.pushState({}, '', '/');
});

// Spara och hämta "reading" och "read" status i cookies
function setChapterSessionStatus(num, status) {
    let session = {};
    try {
        session = JSON.parse(getCookie('chapterSessionStatus') || '{}');
    } catch { session = {}; }
    if (status === undefined) {
        delete session[num];
    } else {
        session[num] = status;
    }
    setCookie('chapterSessionStatus', JSON.stringify(session), 365);
}
function getChapterSessionStatus() {
    try {
        return JSON.parse(getCookie('chapterSessionStatus') || '{}');
    } catch {
        return {};
    }
}

// Spara status i minnet för aktuell session
const manualStatus = {}; // { [chapterNum]: "reading" | "read" | undefined }

// Modifierad statusuppdatering: läser-status från cookie
function updateManualChapterStatus(currentOpenChapterNum = null) {
    const session = getChapterSessionStatus();
    document.querySelectorAll('.kapitel-link').forEach(link => {
        const chapterNum = link.getAttribute('data-chapter');
        link.classList.remove('chapter-read', 'chapter-reading', 'chapter-unread', 'chapter-disabled');
        if (!isChapterAvailable(chapterNum)) {
            link.classList.add('chapter-unread', 'chapter-disabled');
            link.style.opacity = "0.5";
            link.style.pointerEvents = "none";
            return;
        } else {
            link.classList.remove('chapter-disabled');
            link.style.opacity = "";
            link.style.pointerEvents = "";
        }
        if (session[chapterNum] === "read") {
            link.classList.add('chapter-read');
        } else if (session[chapterNum] === "reading") {
            link.classList.add('chapter-reading');
        } else {
            link.classList.add('chapter-unread');
        }
    });
    updateProgressBar();
}

// Initialize chapter status on page load
updateManualChapterStatus();

// === KOPIERA LÄNK TILL URKLIPP ===
const copyLinkBtn = document.getElementById('copyLinkBtn');
if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => showPopup('Länk kopierad!'))
            .catch(() => showPopup('Kunde inte kopiera länk.'));
    });
}

// === FÖRBÄTTRAD TANGENTBORDSNAVIGERING ===
document.addEventListener('keydown', function(e) {
    if (e.key === "Escape") {
        // Stäng popup om den är synlig, annars gå till listvy
        if (popup.classList.contains("show")) {
            hidePopup();
        } else {
            showListView();
        }
    }
});

// Gör det möjligt att öppna kapitel med Enter på kapitel-länk
document.querySelectorAll('.kapitel-link').forEach(link => {
    link.addEventListener('keydown', (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            link.click();
        }
    });
});

// === BOKMÄRKESLISTA POPUP ===
function showBookmarksList() {
    const bm = getBookmarks();
    const chapters = allChapters || {};
    let html = '<div style="max-height:60vh;overflow-y:auto;">';
    const keys = Object.keys(bm).filter(k => bm[k] && bm[k].selectedText);
    if (keys.length === 0) {
        html += '<div style="color:#888;">Inga bokmärken satta.</div>';
    } else {
        html += '<ul style="list-style:none;padding:0;margin:0;">';
        keys.forEach(num => {
            const b = bm[num];
            const title = chapters[num]?.title || `Kapitel ${num}`;
            const label = b.label ? `<b>${b.label}</b> – ` : '';
            const excerpt = b.selectedText.length > 60 ? b.selectedText.slice(0, 60) + '...' : b.selectedText;
            html += `<li style="margin-bottom:12px;">
                <span style="font-size:1em;">${title}</span><br>
                <span style="font-size:0.95em;color:#888;">${label}${excerpt}</span><br>
                <button data-goto="${num}" style="margin-right:8px;padding:5px 12px;border-radius:5px;border:1px solid #bbb;background:#f7f7f7;cursor:pointer;font-size:1em;">Gå till</button>
                <button data-remove="${num}" style="color:#b00;padding:5px 12px;border-radius:5px;border:1px solid #bbb;background:#f7f7f7;cursor:pointer;font-size:1em;">Ta bort</button>
            </li>`;
        });
        html += '</ul>';
    }
    html += `<div style="text-align:right;margin-top:10px;">
        <button id="closeBookmarksListBtn" style="padding:7px 18px;border-radius:6px;border:1px solid #bbb;background:#f7f7f7;cursor:pointer;font-size:1em;">Stäng</button>
    </div></div>`;
    // Återanvänd popup
    message.innerHTML = html;
    popup.classList.add("show");
    popup.setAttribute('aria-live', 'polite');
    popup.focus && popup.focus();

    // Event delegation för knappar
    popup.querySelectorAll('button[data-goto]').forEach(btn => {
        btn.onclick = () => {
            const num = btn.getAttribute('data-goto');
            hidePopup();
            setTimeout(() => loadChapter(num), 200);
        };
    });
    popup.querySelectorAll('button[data-remove]').forEach(btn => {
        btn.onclick = () => {
            const num = btn.getAttribute('data-remove');
            const bookmarks = getBookmarks();
            delete bookmarks[num];
            setBookmarks(bookmarks);
            showBookmarksList(); // Uppdatera listan
        };
    });
    // Ta bort popup-close-knappen temporärt i popupen om den finns (så bara en stäng-knapp syns)
    const closeBtnInPopup = popup.querySelector('.popup-close');
    if (closeBtnInPopup) closeBtnInPopup.style.display = 'none';
    document.getElementById('closeBookmarksListBtn').onclick = () => {
        // Återställ popup-close-knappen när popupen stängs
        if (closeBtnInPopup) closeBtnInPopup.style.display = '';
        hidePopup();
    };
}

// Lägg till knapp i listvyn för att visa bokmärken (en gång)
function addBookmarksListButton() {
    if (document.getElementById('showBookmarksBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'showBookmarksBtn';
    btn.textContent = 'Visa alla bokmärken';
    btn.style.margin = '10px 0 10px 10px';
    btn.style.padding = '8px 16px';
    btn.style.borderRadius = '6px';
    btn.style.border = '1px solid #bbb';
    btn.style.background = '#f7f7f7';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '1em';
    btn.onmouseover = () => btn.style.background = '#e6e6e6';
    btn.onmouseout = () => btn.style.background = '#f7f7f7';
    btn.onclick = showBookmarksList;
    // Lägg till i närheten av kapitel-listan, men bara om listvyn finns
    const kap = document.getElementById('kap');
    if (kap && kap.parentNode) {
        kap.parentNode.insertBefore(btn, kap.nextSibling);
    }
}
window.addEventListener('DOMContentLoaded', addBookmarksListButton);

// Gör även popup-stängknappen lite snyggare
if (closeBtn) {
    closeBtn.style.padding = '6px 14px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.border = '1px solid #bbb';
    closeBtn.style.background = '#f7f7f7';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '1em';
    closeBtn.onmouseover = () => closeBtn.style.background = '#e6e6e6';
    closeBtn.onmouseout = () => closeBtn.style.background = '#f7f7f7';
}

// === EXPORT/IMPORT AV LÄSDATA (BOKMÄRKEN, ANTECKNINGAR, STATUS) ===
function exportUserData() {
    try {
        const data = {
            bookmarks: getBookmarks(),
            notes: getNotes(),
            chapterStatus: getChapterStatus(),
            chapterSessionStatus: getChapterSessionStatus(),
            chapterReadTimes: getReadTimes()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        if (!window.URL || !window.Blob) throw new Error("Export stöds ej i denna webbläsare.");
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "lasdata_export.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        showPopup('Export misslyckades: ' + (e.message || 'Okänt fel'));
    }
}

function importUserData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.bookmarks) setBookmarks(data.bookmarks);
            if (data.notes) setNotes(data.notes);
            if (data.chapterStatus) setChapterStatus(data.chapterStatus);
            if (data.chapterSessionStatus) setCookieObj('chapterSessionStatus', data.chapterSessionStatus, 365);
            if (data.chapterReadTimes) setReadTimes(data.chapterReadTimes);
            showPopup('Läsdata importerad!');
            updateManualChapterStatus();
            updateProgressBar();
        } catch {
            showPopup('Fel vid import av data.');
        }
    };
    reader.readAsText(file);
}

// Lägg till export/import-knappar i footer
function addExportImportButtons() {
    if (document.getElementById('exportUserDataBtn')) return;
    const footer = document.querySelector('.contact-footer');
    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportUserDataBtn';
    exportBtn.textContent = 'Exportera läsdata';
    exportBtn.className = 'reset-btn';
    exportBtn.style.marginLeft = '10px';
    exportBtn.onclick = exportUserData;

    const importBtn = document.createElement('label');
    importBtn.textContent = 'Importera läsdata';
    importBtn.className = 'reset-btn';
    importBtn.style.marginLeft = '10px';
    importBtn.style.cursor = 'pointer';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) importUserData(e.target.files[0]);
    };
    importBtn.appendChild(fileInput);
    importBtn.onclick = () => fileInput.click();

    footer.appendChild(exportBtn);
    footer.appendChild(importBtn);
    exportBtn.style.display = 'inline-block';
    importBtn.style.display = 'inline-block';
    exportBtn.style.marginBottom = '6px';
    importBtn.style.marginBottom = '6px';
    // Responsiv radbrytning
    exportBtn.style.maxWidth = '100%';
    importBtn.style.maxWidth = '100%';
    // Lägg till radbrytning på små skärmar
    if (window.innerWidth < 600) {
        exportBtn.style.display = 'block';
        importBtn.style.display = 'block';
    }
}
window.addEventListener('DOMContentLoaded', addExportImportButtons);

// === SÖKFUNKTION FÖR KAPITELTITLAR ===
const chapterSearchInput = document.getElementById('chapterSearchInput');
if (chapterSearchInput) {
    chapterSearchInput.addEventListener('input', function() {
        const val = chapterSearchInput.value.toLowerCase();
        document.querySelectorAll('.kapitel-link').forEach(link => {
            const title = link.getAttribute('data-chapter-title') || '';
            if (title.toLowerCase().includes(val) || link.textContent.toLowerCase().includes(val)) {
                link.style.display = '';
            } else {
                link.style.display = 'none';
            }
        });
    });
}

// === STATISTIK/ÖVERSIKT ===
function showStatsPopup() {
    const bookmarks = getBookmarks();
    const notes = getNotes();
    const chapterStatus = getChapterStatus();
    const session = getChapterSessionStatus();
    const totalChapters = document.querySelectorAll('.kapitel-link').length;
    let read = 0, reading = 0, unread = 0;
    for (const k in session) {
        if (session[k] === "read") read++;
        else if (session[k] === "reading") reading++;
    }
    unread = totalChapters - read - reading;
    const bmCount = Object.keys(bookmarks).filter(k => bookmarks[k] && bookmarks[k].selectedText).length;
    const noteCount = Object.keys(notes).filter(k => notes[k] && notes[k].trim()).length;
    let html = `
        <div style="padding:10px 0;">
            <b>Statistik</b><br>
            Lästa kapitel: <b>${read}</b> / ${totalChapters}<br>
            Pågående kapitel: <b>${reading}</b><br>
            Olästa kapitel: <b>${unread}</b><br>
            Bokmärken: <b>${bmCount}</b><br>
            Anteckningar: <b>${noteCount}</b>
        </div>
        <div style="text-align:right;margin-top:10px;">
            <button id="closeStatsBtn" style="padding:7px 18px;border-radius:6px;border:1px solid #bbb;background:#f7f7f7;cursor:pointer;font-size:1em;">Stäng</button>
        </div>
    `;
    message.innerHTML = html;
    popup.classList.add("show");
    popup.setAttribute('aria-live', 'polite');
    popup.focus && popup.focus();
    // Tillgänglighet: sätt fokus på stäng-knappen
    setTimeout(() => document.getElementById('closeStatsBtn')?.focus(), 100);
    document.getElementById('closeStatsBtn').onclick = hidePopup;
    // Dölj popup-close-knappen temporärt
    const closeBtnInPopup = popup.querySelector('.popup-close');
    if (closeBtnInPopup) closeBtnInPopup.style.display = 'none';
    document.getElementById('closeStatsBtn').onblur = () => {
        if (closeBtnInPopup) closeBtnInPopup.style.display = '';
    };
}

// Lägg till knapp i footern
function addStatsButton() {
    if (document.getElementById('showStatsBtn')) return;
    const footer = document.querySelector('.contact-footer');
    const btn = document.createElement('button');
    btn.id = 'showStatsBtn';
    btn.textContent = 'Visa statistik';
    btn.className = 'reset-btn';
    btn.style.marginLeft = '10px';
    btn.onclick = showStatsPopup;
    footer.appendChild(btn);
}
window.addEventListener('DOMContentLoaded', addStatsButton);

// === FLER TEMAN ===
const THEMES = [
    { name: "Ljust", class: "", icon: "🌙" },
    { name: "Mörkt", class: "dark-mode", icon: "☀️" },
    { name: "Sepia", class: "sepia-mode", icon: "📜" },
    { name: "Blått", class: "blue-mode", icon: "💧" },
    { name: "Mono", class: "mono-mode", icon: "🖤" }
];
let currentTheme = 0;
function setTheme(idx) {
    // Ta bort alla tema-klasser först
    document.body.classList.remove(...THEMES.map(t => t.class).filter(Boolean));
    // Lägg till aktuell klass om den finns
    if (THEMES[idx].class) document.body.classList.add(THEMES[idx].class);
    localStorage.setItem('themeIdx', idx);
    darkModeToggle.textContent = THEMES[idx].icon;
    darkModeToggle.setAttribute('aria-label', `Växla tema (${THEMES[idx].name})`);
}
(function() {
    let idx = parseInt(localStorage.getItem('themeIdx') || "0", 10);
    if (isNaN(idx) || idx < 0 || idx >= THEMES.length) idx = 0;
    currentTheme = idx;
    setTheme(idx);
})();
darkModeToggle.onclick = () => {
    currentTheme = (currentTheme + 1) % THEMES.length;
    setTheme(currentTheme);
};

// === SEPPIA-TEMA CSS ===
const sepiaStyle = document.createElement('style');
sepiaStyle.innerHTML = `
body.sepia-mode {
    background: linear-gradient(135deg, #f5ecd7 0%, #e0cfa9 100%) !important;
    color: #4e3b1f !important;
}
body.sepia-mode #desc,
body.sepia-mode .chapter-container,
body.sepia-mode .popup-content,
body.sepia-mode .chapter-content,
body.sepia-mode .chapter-line,
body.sepia-mode .desc-content {
    background: #f5ecd7 !important;
    color: #4e3b1f !important;
    border-color: #bfa76a !important;
}
body.sepia-mode .chapter-tooltip {
    background: #bfa76a !important;
    color: #fff !important;
    border: 1.5px solid #a67c00 !important;
}
body.sepia-mode .progress-bar-container {
    background: #bfa76a !important;
}
body.sepia-mode .kapitel-link {
    background: #f5ecd7 !important;
    color: #4e3b1f !important;
    border-color: #bfa76a !important;
}
body.sepia-mode .kapitel-link.chapter-read {
    background: #e0cfa9 !important;
    border-color: #bfa76a !important;
    color: #4e3b1f !important;
}
body.sepia-mode .kapitel-link.chapter-reading {
    background: #f5e6c7 !important;
    border-color: #e0cfa9 !important;
    color: #4e3b1f !important;
}
body.sepia-mode .reset-btn,
body.sepia-mode .back-to-list {
    background: linear-gradient(90deg, #bfa76a 0%, #e0cfa9 100%) !important;
    color: #4e3b1f !important;
}
body.sepia-mode .reset-btn:hover,
body.sepia-mode .back-to-list:hover {
    background: #a67c00 !important;
    color: #fff !important;
}
body.sepia-mode #copyLinkBtn {
    background: #bfa76a !important;
    color: #fff !important;
}
body.sepia-mode #copyLinkBtn:hover {
    background: #a67c00 !important;
    color: #fff !important;
}
body.sepia-mode #darkModeToggle {
    background: linear-gradient(90deg, #bfa76a 0%, #e0cfa9 100%) !important;
    color: #4e3b1f !important;
}
body.sepia-mode .popup .popup-close {
    background: #bfa76a !important;
    color: #fff !important;
}
`;
document.head.appendChild(sepiaStyle);

// === TILLGÄNGLIGHET: ARIA-LABELS OCH TABINDEX ===
document.querySelectorAll('.kapitel-link').forEach(link => {
    link.setAttribute('tabindex', '0');
    link.setAttribute('aria-label', link.getAttribute('data-chapter-title') || link.textContent);
});
document.getElementById('Hd')?.setAttribute('tabindex', '0');
document.getElementById('desc')?.setAttribute('aria-label', 'Bokbeskrivning');
document.getElementById('kap')?.setAttribute('aria-label', 'Kapitelöversikt');
document.getElementById('share')?.setAttribute('aria-label', 'Dela sidan');
document.getElementById('progressBar')?.setAttribute('aria-label', 'Läsprogress');

// === TILLGÄNGLIGHET: ESC STÄNGER POPUP ÄVEN I FORMULÄR ===
popup.addEventListener('keydown', function(e) {
    if (e.key === "Escape") hidePopup();
    // Fånga Tab så fokus stannar i popupen
    if (e.key === "Tab") {
        const focusable = popup.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
});

// === AUTOMATISK SCROLL TILL SENAST LÄSTA KAPITEL ===
window.addEventListener('DOMContentLoaded', () => {
    const session = getChapterSessionStatus();
    let lastRead = null;
    for (const k in session) {
        if (session[k] === "reading" || session[k] === "read") lastRead = k;
    }
    if (lastRead) {
        const el = document.querySelector(`.kapitel-link[data-chapter="${lastRead}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('chapter-reading');
            setTimeout(() => el.classList.remove('chapter-reading'), 2000);
        }
    }
});

// === FAQ/HJÄLP-POPUP ===
function showHelpPopup() {
    const html = `
        <div style="padding:10px 0;max-width:400px;">
            <b>Hjälp & FAQ</b><br>
            <ul style="padding-left:18px;">
                <li><b>Hur sparas min läsdata?</b><br>Allt sparas lokalt i din webbläsare (cookies/localStorage). Ingen data skickas till servern.</li>
                <li><b>Hur exporterar/importerar jag min läshistorik?</b><br>Använd knapparna längst ner på sidan.</li>
                <li><b>Hur sätter jag bokmärken?</b><br>Markera text i ett kapitel och klicka på "Spara markerad text som bokmärke".</li>
                <li><b>Hur byter jag tema?</b><br>Klicka på måne/sol-ikonen uppe till höger.</li>
                <li><b>Hur återställer jag allt?</b><br>Klicka på "Återställ läshistorik" i footern.</li>
            </ul>
            <div style="text-align:right;margin-top:10px;">
                <button id="closeHelpBtn" style="padding:7px 18px;border-radius:6px;border:1px solid #bbb;background:#f7f7f7;cursor:pointer;font-size:1em;">Stäng</button>
            </div>
        </div>
    `;
    message.innerHTML = html;
    popup.classList.add("show");
    setTimeout(() => document.getElementById('closeHelpBtn')?.focus(), 100);
    document.getElementById('closeHelpBtn').onclick = hidePopup;
    const closeBtnInPopup = popup.querySelector('.popup-close');
    if (closeBtnInPopup) closeBtnInPopup.style.display = 'none';
    document.getElementById('closeHelpBtn').onblur = () => {
        if (closeBtnInPopup) closeBtnInPopup.style.display = '';
    };
}
function addHelpButton() {
    if (document.getElementById('showHelpBtn')) return;
    const footer = document.querySelector('.contact-footer');
    const btn = document.createElement('button');
    btn.id = 'showHelpBtn';
    btn.textContent = 'Hjälp / FAQ';
    btn.className = 'reset-btn';
    btn.style.marginLeft = '10px';
    btn.onclick = showHelpPopup;
    footer.appendChild(btn);
}
window.addEventListener('DOMContentLoaded', addHelpButton);

// === DIREKTLÄNK TILL KAPITEL ===
window.addEventListener('DOMContentLoaded', () => {
    // Direktlänk till kapitel
    const hash = window.location.hash;
    if (hash && hash.startsWith('#kapitel-')) {
        const num = hash.replace('#kapitel-', '');
        setTimeout(() => loadChapter(num), 400);
    }
});