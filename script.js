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