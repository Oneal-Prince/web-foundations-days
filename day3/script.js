
let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];



function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}



console.log(
    "searchNotes('JavaScript'):",
    searchNotes("JavaScript")
);


console.log(
    "searchNotes('pizza'):",
    searchNotes("pizza")
);


function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let i = 1; i < notes.length; i++) {
        if (notes[i].text.length > longest.text.length) {
            longest = notes[i];
        }
    }

    return longest;
}



console.log("longestNote():", longestNote());


console.log(
    "longestNote() with notes:",
    notes.length > 0 ? longestNote() : null
);


function countByCategory() {
    let counts = {};

    for (let note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}



console.log("countByCategory():", countByCategory());


console.log(
    "personal count:",
    countByCategory().personal
);




function getSummary() {
    let counts = countByCategory();
    let total = notes.length;

    let noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}



console.log("getSummary():", getSummary());


console.log(
    "getSummary() total:",
    notes.length
);


function isDuplicate(text) {
    let cleanedText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === cleanedText
    );
}



console.log(
    "isDuplicate('Buy milk and bread'):",
    isDuplicate("Buy milk and bread")
);


console.log(
    "isDuplicate('  BUY MILK AND BREAD  '):",
    isDuplicate("  BUY MILK AND BREAD  ")
);


console.log(
    "isDuplicate('Go to the gym'):",
    isDuplicate("Go to the gym")
);

function addNote(text, category) {
    let cleanedText = text.trim();


    if (cleanedText.length < 1 || cleanedText.length > 200) {
        console.log("Note not added: text must be 1-200 characters.");
        return false;
    }

   
    if (isDuplicate(cleanedText)) {
        console.log("Note not added: duplicate note.");
        return false;
    }

    
    let validCategories = ["personal", "work", "study"];

    if (!validCategories.includes(category)) {
        console.log(
            "Note not added: category must be personal, work or study."
        );
        return false;
    }

    
    let newNote = {
        id: notes.length > 0
            ? Math.max(...notes.map(note => note.id)) + 1
            : 1,
        text: cleanedText,
        category: category
    };

    notes.push(newNote);

    console.log("Note added:", newNote);

    return true;
}


console.log(
    "addNote('Study DOM manipulation', 'study'):",
    addNote("Study DOM manipulation", "study")
);


console.log(
    "addNote('  BUY MILK AND BREAD  ', 'personal'):",
    addNote("  BUY MILK AND BREAD  ", "personal")
);


console.log(
    "addNote('Go shopping', 'shopping'):",
    addNote("Go shopping", "shopping")
);


console.log(
    "addNote('', 'personal'):",
    addNote("", "personal")
);



console.log(
    "addNote(long text, 'personal'):",
    addNote("a".repeat(201), "personal")
);

console.log("Final notes:", notes);