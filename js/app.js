const pageWrapper = document.getElementById("page-wrapper");
const main = document.getElementById("main");
const dashboard = document.getElementById("dashboard");

document.querySelector(".main-button").addEventListener("click", (e) => {
  e.preventDefault();
  pageWrapper.style.transition = "transform 0.9s cubic-bezier(0.76, 0, 0.24, 1)";
  pageWrapper.style.transform = "translateY(0)";
  setTimeout(() => {
    dashboard.style.opacity = "1";
    if (window.invalidateMap) window.invalidateMap();
  }, 550);
});

document.getElementById("back-button").addEventListener("click", () => {
  dashboard.style.opacity = "0";
  setTimeout(() => {
    pageWrapper.style.transform = "translateY(-100vh)";
  }, 250);
});