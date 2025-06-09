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
    // Rensa visuellt
    document.querySelectorAll('.chapter-read, .chapter-reading, .chapter-unread').forEach(chapter => {
        chapter.classList.remove('chapter-read', 'chapter-reading', 'chapter-unread');
    });
    showPopup('All läshistorik, bokmärken och noteringar har återställts!');
    updateChapterStatus();
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
    message.textContent = text
    popup.classList.add("show")
}

function hidePopup(){
    popup.classList.remove("show");
}

//how should i trigger the popup?
// i think i should trigger it when the user first visits the page
window.addEventListener("load", () => {
    showPopup("Denna websida använder cookies för att spara läs-data. (Tryck på Återställ läshistorik) om du inte vill ha några kakor");
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
    document.getElementById('desc').style.display = 'block';
    document.getElementById('share').style.display = 'block';
    document.getElementById('kap').style.display = 'block';
    document.querySelector('.contact-footer').style.display = 'block';
    chapterContent.classList.add('hidden');
}

// Ladda in alla kapitel från chapters.json vid sidladdning
let allChapters = {};
let chaptersLoaded = false;
fetch('chapters/chapters.json')
    .then(res => res.json())
    .then(data => {
        allChapters = data.chapters || {};
        chaptersLoaded = true;
        updateManualChapterStatus();
    })
    .catch(() => {
        showPopup('Kunde inte ladda kapiteldata. Kontrollera din internetanslutning eller filen chapters.json.');
        allChapters = {};
        chaptersLoaded = false;
        updateManualChapterStatus();
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

// Modifiera loadChapter så att den visar/döljer rätt sektioner
async function loadChapter(num) {
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

        // Gå till bokmärke: scrolla till första förekomsten och markera
        if (bookmarkObj && bookmarkText && document.getElementById('gotoBookmarkBtn')) {
            document.getElementById('gotoBookmarkBtn').onclick = () => {
                // Hämta senaste bokmärkesdata
                const bm = getBookmark(num);
                const text = bm && bm.selectedText;
                if (!text) return;
                const lines = Array.from(contentDiv.querySelectorAll('.chapter-line'));
                let found = false;
                lines.forEach(line => {
                    line.classList.remove('bookmark-highlight-line');
                });
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].textContent.includes(text)) {
                        lines[i].classList.add('bookmark-highlight-line');
                        lines[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        found = true;
                        setTimeout(() => lines[i].classList.remove('bookmark-highlight-line'), 2500);
                        break;
                    }
                }
                if (found) {
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
}

// Initialize chapter status on page load
updateManualChapterStatus();