
const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');


function updateCounts() {
    const text = noteText.value;
    const charLen = text.length;

   
    charCount.textContent = `${charLen} / 200 characters`;

    
    charCount.className = ''; 
    if (charLen > 200) {
        charCount.classList.add('over');
    } else if (charLen > 180) {
        charCount.classList.add('warning');
    }

    
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    wordCount.textContent = `${words.length} words`;
}


function clearAll() {
    noteText.value = '';
    localStorage.removeItem('note-draft');
    updateCounts();
}


noteText.addEventListener('input', () => {
    updateCounts();
    localStorage.setItem('note-draft', noteText.value);
});


noteText.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        clearAll();
    }
});


clearBtn.addEventListener('click', clearAll);


themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});


window.addEventListener('DOMContentLoaded', () => {
   
    const savedDraft = localStorage.getItem('note-draft');
    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }

 
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = 'Light mode';
    } else {
        document.body.classList.remove('dark');
        themeToggle.textContent = 'Dark mode';
    }

   
    updateCounts();
});