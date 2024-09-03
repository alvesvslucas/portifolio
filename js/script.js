var abrirMenu = document.querySelector(".abrir-menu-icon");
var fecharMenu = document.querySelector(".fechar-menu-icon");
var menuAtivo = document.querySelector(".menu-hamburger");

abrirMenu.addEventListener('click', function () {
    abrirMenu.style.display = "none";
    fecharMenu.style.display = "block";
    menuAtivo.classList.add("menu-hamburger-ativo");
});

fecharMenu.addEventListener('click', function () {
    fecharMenu.style.display = "none";
    abrirMenu.style.display = "block";
    menuAtivo.classList.remove("menu-hamburger-ativo");
});

var gridPortfolio = document.querySelectorAll(".grid-portfolio");
var gridLinkProjetos = document.querySelectorAll(".grid-portfolio-links-projetos");

gridPortfolio.forEach(function(gridPortfolioAtual, index){
    gridPortfolioAtual.addEventListener('mouseover', function(){
        gridLinkProjetos[index].classList.add("grid-portfolio-links-projetos-ativo");
    });

    gridPortfolioAtual.addEventListener('mouseout', function(){
        gridLinkProjetos[index].classList.remove("grid-portfolio-links-projetos-ativo");
    });
});