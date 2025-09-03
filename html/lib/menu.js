const menuContainer = document.getElementById("menu");
const navMenu = document.createElement('div');
const menuButton = document.createElement('button');
let isMenuVisible = false;
menuButton.textContent = "≡";
menuButton.style.background = "none";
menuButton.style.border = "none";
menuButton.style.fontSize = "1.5em";
menuButton.style.cursor = "pointer";
navMenu.style.position = "absolute";
navMenu.style.top = "5em";
navMenu.style.width = "200px";
navMenu.style.background = "white";
navMenu.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
navMenu.style.borderRadius = "4px";
navMenu.style.transition = "all 0.3s ease";
navMenu.style.opacity = "0";
navMenu.style.transform = "translateY(-10px)";
navMenu.style.display = "none"; 
navMenu.style.padding = "0.5em 0";
navMenu.id = "menu-nav";
navMenu.innerHTML = `
  <a href="/" style="display: block; padding: 0.8em 1em; text-decoration: none; color: #333;">首页</a>
  <a href="/filesD/m.html" style="display: block; padding: 0.8em 1em; text-decoration: none; color: #333;">聊天室</a>
`;
menuButton.addEventListener("click", (e) => {
  e.stopPropagation(); 
  isMenuVisible = !isMenuVisible;
  navMenu.style.display = isMenuVisible ? "block" : "none";
  navMenu.style.opacity = isMenuVisible ? "1" : "0";
  navMenu.style.transform = isMenuVisible ? "translateY(0)" : "translateY(-10px)";
});
document.addEventListener('click', () => {
  if (isMenuVisible) {
    isMenuVisible = false;
    navMenu.style.display = "none";
    navMenu.style.opacity = "0";
    navMenu.style.transform = "translateY(-10px)";
  }
});
navMenu.addEventListener('click', (e) => {
  e.stopPropagation();
});
menuContainer.appendChild(menuButton);
menuContainer.appendChild(navMenu);
const links = navMenu.querySelectorAll('a');
links.forEach(link => {
  link.addEventListener('mouseenter', () => {
    link.style.background = "#f5f5f5";
  });
  link.addEventListener('mouseleave', () => {
    link.style.background = "";
  });
});