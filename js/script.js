/* VINHOLI - script.js */
(() => {
  'use strict';

  /* ============================================================
     SUPABASE
     ============================================================ */

  let supabaseClient = null;

  function getSupabase() {
    if (supabaseClient) return supabaseClient;

    if (
      !window.supabase ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY
    ) {
      console.error('Supabase não configurado no site público.');
      return null;
    }

    supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    return supabaseClient;
  }

  /* ============================================================
     DADOS DE EXEMPLO
     
     Mantidos apenas como referência visual.
     O site utiliza os dados do Supabase.
     ============================================================ */

  const IMOVEIS = [
    {
      id: 1,
      tipo: 'Casa',
      negocio: 'venda',
      titulo: 'Residência Contemporânea',
      local: 'Alphaville, Barueri',
      valor: 4850000,
      quartos: 5,
      banheiros: 6,
      vagas: 4,
      imagem:
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80'
    },
    {
      id: 2,
      tipo: 'Apartamento',
      negocio: 'venda',
      titulo: 'Apartamento Vista Panorâmica',
      local: 'Jardins, São Paulo',
      valor: 3200000,
      quartos: 3,
      banheiros: 4,
      vagas: 3,
      imagem:
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80'
    },
    {
      id: 3,
      tipo: 'Cobertura',
      negocio: 'aluguel',
      titulo: 'Cobertura Duplex Reservada',
      local: 'Vila Nova Conceição, São Paulo',
      valor: 28000,
      quartos: 4,
      banheiros: 5,
      vagas: 4,
      imagem:
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80'
    }
  ];

  /* ============================================================
     SERVIÇOS
     ============================================================ */

  const SERVICOS = [
    {
      t: 'Compra de imóveis',
      d: 'Curadoria de opções alinhadas ao seu perfil e orçamento.',
      i: '<path d="M4 21V9l8-6 8 6v12M9 21v-7h6v7"/>'
    },
    {
      t: 'Locação',
      d: 'Contratos claros e locatários analisados com critério.',
      i: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>'
    },
    {
      t: 'Venda de imóveis',
      d: 'Estratégia e divulgação para vender com valor justo.',
      i: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'
    },
    {
      t: 'Administração de imóveis',
      d: 'Gestão completa: cobranças, vistorias e manutenção.',
      i: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>'
    },
    {
      t: 'Avaliação imobiliária',
      d: 'Análise técnica de mercado para precificar com segurança.',
      i: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6M11 8v6"/>'
    },
    {
      t: 'Atendimento especializado',
      d: 'Orientação personalizada para encontrar oportunidades alinhadas ao seu momento.',
      i: '<path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/>'
    }
  ];

  /* ============================================================
     CARREGAMENTO DOS IMÓVEIS
     
     1. Busca os imóveis publicados.
     2. Busca as fotos separadamente.
     3. Usa storage_path para montar a URL pública.
     ============================================================ */

  async function fetchImoveis() {
    const supabase = getSupabase();

    if (!supabase) {
      return [];
    }

    try {
      /* --------------------------------------------------------
         1. BUSCAR IMÓVEIS
         -------------------------------------------------------- */

      const { data: imoveis, error: imoveisError } = await supabase
        .from(window.SUPABASE_TABLE || 'imoveis')
        .select(`
          id,
          tipo,
          negocio,
          titulo,
          cidade,
          bairro,
          valor,
          quartos,
          banheiros,
          vagas,
          area_util,
          area_construida,
          descricao,
          codigo,
          destaque,
          created_at
        `)
        .eq('status', 'publicado')
        .order('destaque', { ascending: false })
        .order('created_at', { ascending: false });

      if (imoveisError) {
        console.error(
          'Erro ao buscar imóveis no Supabase:',
          imoveisError
        );

        return [];
      }

      if (!imoveis || imoveis.length === 0) {
        return [];
      }

      /* --------------------------------------------------------
         2. PEGAR OS IDs DOS IMÓVEIS
         -------------------------------------------------------- */

      const ids = imoveis.map(imovel => imovel.id);

      /* --------------------------------------------------------
         3. BUSCAR FOTOS SEPARADAMENTE
         -------------------------------------------------------- */

      const { data: fotos, error: fotosError } = await supabase
        .from('imovel_fotos')
        .select(`
          id,
          imovel_id,
          storage_path,
          url,
          ordem,
          principal,
          tipo_midia
        `)
        .in('imovel_id', ids)
        .order('principal', { ascending: false })
        .order('ordem', { ascending: true });

      if (fotosError) {
        console.error(
          'Erro ao buscar fotos dos imóveis:',
          fotosError
        );
      }

      /* --------------------------------------------------------
         4. ORGANIZAR FOTOS POR IMÓVEL
         -------------------------------------------------------- */

      const fotosPorImovel = {};

      (fotos || []).forEach(foto => {
        if (!fotosPorImovel[foto.imovel_id]) {
          fotosPorImovel[foto.imovel_id] = [];
        }

        fotosPorImovel[foto.imovel_id].push(foto);
      });

      /* --------------------------------------------------------
         5. MONTAR OBJETOS PARA O SITE
         -------------------------------------------------------- */

      return imoveis.map(imovel => {
        const fotosImovel =
          fotosPorImovel[imovel.id] || [];

        /* Ignora vídeos na imagem principal do card */
        const fotosImagem = fotosImovel.filter(
          foto => foto.tipo_midia !== 'video'
        );

        /* Primeiro tenta principal */
        let fotoPrincipal = fotosImagem.find(
          foto => foto.principal === true
        );

        /* Se não houver principal, pega a primeira */
        if (!fotoPrincipal) {
          fotoPrincipal = fotosImagem[0];
        }

        let imagemPrincipal =
          './assets/img/placeholder.jpg';

        /* ------------------------------------------------------
           GERAR URL DIRETAMENTE PELO STORAGE_PATH
           ------------------------------------------------------ */

        if (fotoPrincipal?.storage_path) {
          const { data: publicData } = supabase.storage
            .from(window.SUPABASE_BUCKET || 'imoveis')
            .getPublicUrl(fotoPrincipal.storage_path);

          if (publicData?.publicUrl) {
            imagemPrincipal = publicData.publicUrl;
          }
        }

        /* Fallback para URL existente no banco */
        if (
          imagemPrincipal === './assets/img/placeholder.jpg' &&
          fotoPrincipal?.url
        ) {
          imagemPrincipal = fotoPrincipal.url;
        }

        const fotosUrls = fotosImagem.map(foto => {
          if (foto.storage_path) {
            const { data: publicData } = supabase.storage
              .from(window.SUPABASE_BUCKET || 'imoveis')
              .getPublicUrl(foto.storage_path);
            if (publicData?.publicUrl) return publicData.publicUrl;
          }
          return foto.url || '';
        }).filter(Boolean);

        return {
          id: imovel.id,

          tipo:
            imovel.tipo ||
            'Imóvel',

          negocio:
            imovel.negocio ||
            'venda',

          titulo:
            imovel.titulo ||
            'Imóvel VINHOLI',

          local:
            [imovel.bairro, imovel.cidade]
              .filter(Boolean)
              .join(', ') ||
            'Localização não informada',

          valor:
            Number(imovel.valor) || 0,

          quartos:
            Number(imovel.quartos) || 0,

          banheiros:
            Number(imovel.banheiros) || 0,

          vagas:
            Number(imovel.vagas) || 0,

          area:
            Number(imovel.area_util || imovel.area_construida) || 0,

          codigo:
            imovel.codigo || "",

          descricao:
            imovel.descricao || '',

          fotos:
            fotosUrls.length ? fotosUrls : [imagemPrincipal],

          destaque:
            imovel.destaque === true,

          imagem:
            imagemPrincipal
        };
      });

    } catch (error) {
      console.error(
        'Erro inesperado ao carregar imóveis:',
        error
      );

      return [];
    }
  }

  /* ============================================================
     HELPERS
     ============================================================ */

  const $ = (s, r = document) =>
    r.querySelector(s);

  const $$ = (s, r = document) =>
    [...r.querySelectorAll(s)];

  const brl = n =>
    Number(n || 0).toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      }
    );

  const num = v =>
    parseInt(
      String(v).replace(/\D/g, ''),
      10
    ) || 0;

  /* ============================================================
     PRELOADER 0-100%
     ============================================================ */

  const pre = $('#preloader');
  const bar = $('#preBar');
  const pct = $('#prePct');

  const DURATION = 2800;

  let t0 = null;

  function tickLoad(ts) {
    t0 ??= ts;

    const p = Math.min(
      (ts - t0) / DURATION,
      1
    );

    const e =
      1 - Math.pow(1 - p, 3);

    if (bar) {
      bar.style.transform =
        `scaleX(${e})`;
    }

    if (pct) {
      pct.textContent =
        Math.round(e * 100);
    }

    if (p < 1) {
      requestAnimationFrame(tickLoad);
    } else {
      finishLoad();
    }
  }

  function finishLoad() {
    setTimeout(() => {
      if (pre) {
        pre.classList.add('done');
      }

      document.body.classList.remove(
        'is-loading'
      );

      startReveal();
    }, 350);
  }

  requestAnimationFrame(tickLoad);

  /* ============================================================
     HEADER + MENU MOBILE
     ============================================================ */

  const header = $('#header');
  const nav = $('#nav');
  const burger = $('#burger');

  const onScroll = () => {
    if (header) {
      header.classList.toggle(
        'stuck',
        scrollY > 30
      );
    }
  };

  addEventListener(
    'scroll',
    onScroll,
    { passive: true }
  );

  onScroll();

  function toggleMenu(open) {
    if (!nav || !burger) return;

    nav.classList.toggle(
      'open',
      open
    );

    burger.setAttribute(
      'aria-expanded',
      open
    );

    document.body.style.overflow =
      open ? 'hidden' : '';
  }

  if (burger) {
    burger.addEventListener(
      'click',
      () =>
        toggleMenu(
          !nav.classList.contains('open')
        )
    );
  }

  if (nav) {
    $$('a', nav).forEach(a =>
      a.addEventListener(
        'click',
        () => toggleMenu(false)
      )
    );
  }

  addEventListener(
    'keydown',
    e => {
      if (e.key === 'Escape') {
        toggleMenu(false);
      }
    }
  );

  /* ============================================================
     FAVORITOS
     ============================================================ */

  let favs;

  try {
    favs = new Set(
      JSON.parse(
        localStorage.getItem(
          'vonholi:favs'
        ) || '[]'
      )
    );
  } catch {
    favs = new Set();
  }

  const saveFavs = () =>
    localStorage.setItem(
      'vonholi:favs',
      JSON.stringify([...favs])
    );

  /* ============================================================
     RENDER DOS CARDS
     ============================================================ */

  const grid = $('#propGrid');
  const empty = $('#emptyMsg');
  const info = $('#resultInfo');
  let currentRenderedProperties = [];


  const icon = {
    bed:
      '<svg viewBox="0 0 24 24"><path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/></svg>',

    bath:
      '<svg viewBox="0 0 24 24"><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM6 12V6a2 2 0 0 1 4 0"/></svg>',

    car:
      '<svg viewBox="0 0 24 24"><path d="M5 16V12l2-5h10l2 5v4M3 16h18M7 19v-3M17 19v-3"/></svg>'
  };

  function card(p, i) {
    const el = document.createElement('article');
    el.className = 'card reveal';
    el.dataset.id = p.id;
    el.tabIndex = 0;
    el.setAttribute('role', 'link');
    el.setAttribute('aria-label', `Ver imóvel ${p.titulo || ''}`);
    el.style.setProperty('--d', (i % 3) * 0.1 + 's');

    const photos = Array.isArray(p.fotos) && p.fotos.length ? p.fotos : [p.imagem];
    const safeIndex = Math.min(Number(p._photoIndex) || 0, photos.length - 1);
    p._photoIndex = safeIndex;
    const arrows = photos.length > 1 ? `
      <div class="card-photo-nav" aria-label="Navegação de fotos">
        <button type="button" class="card-photo-arrow prev" data-photo-dir="-1" aria-label="Foto anterior">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button type="button" class="card-photo-arrow next" data-photo-dir="1" aria-label="Próxima foto">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>` : '';

    const description = String(p.descricao || '').replace(/\s+/g, ' ').trim();

    el.innerHTML = `
      <div class="card-img">
        ${p.destaque ? '<span class="featured-badge">DESTAQUE</span>' : ''}
        <img class="card-photo" src="${photos[safeIndex]}" alt="${p.titulo || 'Imóvel'}" loading="lazy" decoding="async" onerror="this.style.display='none'">
        ${arrows}
        <span class="tag">${p.negocio === 'venda' ? 'Venda' : 'Locação'}</span>
        <button class="fav ${favs.has(p.id) ? 'on' : ''}" data-id="${p.id}" aria-label="Favoritar imóvel" aria-pressed="${favs.has(p.id)}">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/></svg>
        </button>
      </div>
      <div class="card-body">
        <span class="kind">${p.tipo}</span>
        <h3>${p.titulo}</h3>
        <span class="loc">${p.local}</span>
        ${description ? `<p class="card-description">${description}</p>` : ''}
        <p class="price">${brl(p.valor)}${p.negocio === 'aluguel' ? ' <small>/ mês</small>' : ''}</p>
        <div class="specs">
          <span title="Quartos">${icon.bed}${p.quartos}</span>
          <span title="Banheiros">${icon.bath}${p.banheiros}</span>
          <span title="Vagas">${icon.car}${p.vagas}</span>
          ${p.area > 0 ? `<span title="Área"><svg viewBox="0 0 24 24"><path d="M4 4h6M4 4v6M20 20h-6M20 20v-6M4 20h6M4 20v-6M20 4h-6M20 4v6"/></svg>${p.area} m²</span>` : ''}
        </div>
        <a href="./imovel.html?id=${encodeURIComponent(p.id)}" class="btn btn-line" data-id="${p.id}">Ver imóvel</a>
      </div>`;

    return el;
  }

  function render(list) {
    if (!grid) return;

    grid.innerHTML = '';
    currentRenderedProperties = list;

    list.forEach(
      (p, i) =>
        grid.appendChild(
          card(p, i)
        )
    );

    if (empty) {
      empty.hidden =
        list.length > 0;
    }

    if (info) {
      info.textContent =
        list.length
          ? `${list.length} ${
              list.length === 1
                ? 'imóvel encontrado'
                : 'imóveis encontrados'
            }`
          : 'Uma curadoria de endereços com o padrão VINHOLI.';
    }

    startReveal();
  }

  if (grid) {
    grid.addEventListener('click', e => {
      const arrow = e.target.closest('.card-photo-arrow');
      if (!arrow) return;
      e.preventDefault();
      e.stopPropagation();
      const cardEl = arrow.closest('.card');
      const id = cardEl?.dataset.id;
      if (!cardEl || !id) return;
      const item = currentRenderedProperties.find(p => String(p.id) === String(id));
      if (!item) return;
      const photos = Array.isArray(item.fotos) && item.fotos.length ? item.fotos : [item.imagem];
      if (photos.length < 2) return;
      const dir = Number(arrow.dataset.photoDir || 1);
      item._photoIndex = ((Number(item._photoIndex) || 0) + dir + photos.length) % photos.length;
      const img = cardEl.querySelector('.card-photo');
      if (img) {
        img.src = photos[item._photoIndex];
        img.style.display = '';
      }
    });

    grid.addEventListener(
      'click',
      e => {
        const f =
          e.target.closest(
            '.fav'
          );

        if (!f) return;

        const id =
          f.dataset.id;

        favs.has(id)
          ? favs.delete(id)
          : favs.add(id);

        f.classList.toggle(
          'on',
          favs.has(id)
        );

        f.setAttribute(
          'aria-pressed',
          favs.has(id)
        );

        f.classList.remove(
          'pop'
        );

        void f.offsetWidth;

        f.classList.add(
          'pop'
        );

        saveFavs();
      }
    );

    grid.addEventListener('click', e => {
      if (e.target.closest('.fav, .card-photo-arrow')) return;
      const cardEl = e.target.closest('.card');
      if (!cardEl) return;
      const link = e.target.closest('a');
      if (link) return;
      const id = cardEl.dataset.id;
      if (id) window.location.href = `./imovel.html?id=${encodeURIComponent(id)}`;
    });
  }

  /* ============================================================
     BUSCA / FILTROS
     ============================================================ */

  const form =
    $('#searchForm');

  const state = {
    negocio: 'venda'
  };

  async function atualizarLocais() {
    if (!form) return;

    const imoveis =
      await fetchImoveis();

    const locais =
      [
        ...new Set(
          imoveis
            .map(p => p.local)
            .filter(Boolean)
        )
      ];

    const locaisElement =
      $('#locais');

    if (locaisElement) {
      locaisElement.innerHTML =
        locais
          .map(
            l =>
              `<option value="${l}">`
          )
          .join('');
    }
  }

  atualizarLocais();

  function setDeal(d) {
    state.negocio = d;

    $$('.deal button')
      .forEach(b =>
        b.classList.toggle(
          'on',
          b.dataset.deal === d
        )
      );
  }

  $$('.deal button')
    .forEach(b =>
      b.addEventListener(
        'click',
        () =>
          setDeal(
            b.dataset.deal
          )
      )
    );

  $$('.nav a[data-deal]')
    .forEach(a =>
      a.addEventListener(
        'click',
        () => {
          setDeal(
            a.dataset.deal
          );

          applyFilters();
        }
      )
    );

  async function applyFilters() {
    if (!form) return;

    const d =
      new FormData(form);

    const min =
      num(d.get('min'));

    const max =
      num(d.get('max'));

    const q =
      (
        d.get('local') || ''
      )
        .toLowerCase()
        .trim();

    const all =
      await fetchImoveis();

    const tipo =
      d.get('tipo');

    const quartos =
      Number(
        d.get('quartos')
      ) || 0;

    const list =
      all.filter(p =>
        p.negocio ===
          state.negocio &&

        (!tipo ||
          p.tipo === tipo) &&

        (!q ||
          p.local
            .toLowerCase()
            .includes(q)) &&

        (!min ||
          p.valor >= min) &&

        (!max ||
          p.valor <= max) &&

        p.quartos >=
          quartos
      );

    render(list);
  }

  if (form) {
    ['min', 'max']
      .forEach(n => {
        if (!form.elements[n])
          return;

        form.elements[n]
          .addEventListener(
            'input',
            e => {
              const v =
                num(
                  e.target.value
                );

              e.target.value =
                v
                  ? brl(v)
                  : '';
            }
          );
      });

    form.addEventListener(
      'submit',
      e => {
        e.preventDefault();

        applyFilters()
          .then(() => {
            const section =
              $('#imoveis');

            if (section) {
              section.scrollIntoView({
                behavior: 'smooth'
              });
            }
          });
      }
    );
  }

  const clearFilters =
    $('#clearFilters');

  if (clearFilters) {
    clearFilters.addEventListener(
      'click',
      () => {
        if (form) {
          form.reset();
        }

        setDeal('venda');

        showAll();
      }
    );
  }

  async function showAll() {
    const imoveis =
      await fetchImoveis();

    render(imoveis);
  }

  /* ============================================================
     SERVIÇOS
     ============================================================ */

  const services =
    $('#services');

  if (services) {
    services.innerHTML =
      SERVICOS
        .map(
          (s, i) => `
            <div
              class="service reveal"
              style="--d:${(i % 3) * 0.1}s"
            >

              <svg
                viewBox="0 0 24 24"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                ${s.i}
              </svg>

              <h3>
                ${s.t}
              </h3>

              <p>
                ${s.d}
              </p>

            </div>
          `
        )
        .join('');
  }

  /* ============================================================
     ANIMAÇÕES DE ENTRADA
     ============================================================ */

  let io;

  function startReveal() {
    if (
      document.body.classList.contains(
        'is-loading'
      )
    ) {
      return;
    }

    io ??=
      new IntersectionObserver(
        entries =>
          entries.forEach(entry => {
            if (
              entry.isIntersecting
            ) {
              entry.target.classList.add(
                'in'
              );

              io.unobserve(
                entry.target
              );
            }
          }),
        {
          threshold: 0.12,
          rootMargin:
            '0px 0px -40px 0px'
        }
      );

    $$('.reveal:not(.in)')
      .forEach(el =>
        io.observe(el)
      );
  }

  /* ============================================================
     INIT
     ============================================================ */

  const year =
    $('#year');

  if (year) {
    year.textContent =
      new Date().getFullYear();
  }

  showAll();


  /* ============================================================
     IDIOMAS
     ============================================================ */
  const translations = {
    'pt-BR': {
      'nav.home':'Início','nav.properties':'Imóveis','nav.buy':'Comprar','nav.rent':'Alugar','nav.about':'Sobre','nav.contact':'Contato',
      'featured.title':'Imóveis em destaque','featured.subtitle':'Uma curadoria de endereços com o padrão VINHOLI.','search.all':'Todos','search.any':'Qualquer','search.button':'Buscar imóveis'
    },
    'en-US': {
      'nav.home':'Home','nav.properties':'Properties','nav.buy':'Buy','nav.rent':'Rent','nav.about':'About','nav.contact':'Contact',
      'featured.title':'Featured properties','featured.subtitle':'A curated selection of addresses with the VINHOLI standard.','search.all':'All','search.any':'Any','search.button':'Search properties'
    }
  };

  function setLanguage(lang) {
    const dict = translations[lang] || translations['pt-BR'];
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const value = dict[el.dataset.i18n];
      if (value) el.textContent = value;
    });
    $$('.language-btn').forEach(btn => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    try { localStorage.setItem('vinholi:language', lang); } catch (_) {}
  }

  $$('.language-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
  let savedLanguage = 'pt-BR';
  try { savedLanguage = localStorage.getItem('vinholi:language') || 'pt-BR'; } catch (_) {}
  setLanguage(savedLanguage);

})();