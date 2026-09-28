(() => {
  'use strict';
  const savedLang=localStorage.getItem('vinholi:lang') || 'pt';
  const dict={
    pt:{home:'Início',properties:'Imóveis',buy:'Comprar',rent:'Alugar',about:'Sobre',contact:'Contato',admin:'Área Administrativa',back:'Voltar para imóveis',whatsapp:'Falar no WhatsApp',openMaps:'Abrir no Google Maps',rooms:'Cômodos',features:'Características',nearby:'Proximidades',description:'Descrição do imóvel',interested:'Interessado?',talk:'Fale com a VINHOLI',other:'Ver outros imóveis',details:'Receba mais informações, condições e agende uma visita ao imóvel.'},
    en:{home:'Home',properties:'Properties',buy:'Buy',rent:'Rent',about:'About',contact:'Contact',admin:'Admin Area',back:'Back to properties',whatsapp:'WhatsApp',openMaps:'Open in Google Maps',rooms:'Rooms',features:'Features',nearby:'Nearby',description:'Property description',interested:'Interested?',talk:'Talk to VINHOLI',other:'View other properties',details:'Get more information, terms and schedule a visit to the property.'}
  };
  const applyLang=lang=>{
    localStorage.setItem('vinholi:lang',lang); document.documentElement.lang=lang==='en'?'en':'pt-BR';
    document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
    document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(dict[lang][k])el.textContent=dict[lang][k];});
  };
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>applyLang(b.dataset.lang)));
  applyLang(savedLang);
})();
