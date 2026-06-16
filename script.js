const navItems = document.querySelectorAll(".nav-item");
const title = document.querySelector("h1");
const sectionNames = {
  dashboard: "Calendario operativo",
  clienti: "Clienti e contatti",
  opportunita: "Opportunità di lavoro",
  cantieri: "Cantieri attivi",
  preventivi: "Preventivi e offerte",
  agenda: "Agenda operativa",
};

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((navItem) => navItem.classList.remove("active"));
    item.classList.add("active");
    title.textContent = sectionNames[item.dataset.view] || "Cruscotto commerciale";
  });
});

document.querySelectorAll(".segmented-control button").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement
      .querySelectorAll("button")
      .forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });
});
