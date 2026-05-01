function openGame(url) {
    window.location.href = url;
}

function filterGames() {
    const input = document.getElementById('searchBar').value.toLowerCase();
    const cards = document.getElementsByClassName('game-card');

    for (let i = 0; i < cards.length; i++) {
        const title = cards[i].getElementsByTagName('h3')[0].innerText.toLowerCase();
        if (title.includes(input)) {
            cards[i].style.display = "";
        } else {
            cards[i].style.display = "none";
        }
    }
}
