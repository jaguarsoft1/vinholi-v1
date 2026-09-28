(() => {
  "use strict";

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const configured = window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes("COLE_AQUI") &&
    !window.SUPABASE_ANON_KEY.includes("COLE_AQUI");

  const supabase = configured ? window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  ) : null;

  const moneyToNumber = value => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits ? Number(digits) / 100 : 0;
  };

  const formatMoney = value => Number(value || 0).toLocaleString("pt-BR", {
    style:"currency", currency:"BRL"
  });

  const slugify = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

  function message(el, text, error=false) {
    if (!el) return;
    el.className = "form-message" + (error ? " error" : "");
    el.textContent = text;
  }

  // Segurança de páginas protegidas
  async function requireAuth() {
    if (!supabase) return true; // permite visualizar o layout antes de configurar o projeto
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) location.href = "./index.html";
    return !!session;
  }

  // LOGIN
  const loginForm = $("#loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();
      const msg = $("#loginMessage");
      if (!supabase) {
        message(msg, "O sistema ainda não está configurado. Entre em contato com o suporte.", true);
        return;
      }
      message(msg, "Entrando...");
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        message(msg, error.message, true);
        return;
      }
      location.href = "./dashboard.html";
    });

    $("#forgotPassword")?.addEventListener("click", async e => {
      e.preventDefault();
      if (!supabase) return message($("#loginMessage"), "O sistema ainda não está configurado. Entre em contato com o suporte.", true);
      const email = $("#email").value.trim();
      if (!email) return message($("#loginMessage"), "Digite seu e-mail para recuperar a senha.", true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname.replace("index.html", "index.html")
      });
      message($("#loginMessage"), error ? error.message : "Se o e-mail existir, você receberá as instruções.");
    });
  }

  $$(".password-toggle").forEach(btn => btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
    btn.textContent = input.type === "password" ? "Mostrar" : "Ocultar";
  }));

  $("#mobileMenu")?.addEventListener("click", (event) => {
  event.stopPropagation();
  $("#sidebar")?.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  const sidebar = $("#sidebar");
  const mobileMenu = $("#mobileMenu");

  if (!sidebar?.classList.contains("open")) return;

  if (
    !sidebar.contains(event.target) &&
    !mobileMenu?.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

  $("#logoutBtn")?.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    location.href = "./index.html";
  });

  // DASHBOARD
  const table = $("#propertyTable");
  let properties = [];

  async function loadProperties() {
    if (!table && !$("#totalCount")) return;
    await requireAuth();
    if (!supabase) {
      table.innerHTML = `<tr><td colspan="${document.querySelector(".catalog-table") ? 7 : 6}">Não foi possível carregar os imóveis no momento.</td></tr>`;
      return;
    }

    const { data, error } = await supabase
      .from(window.SUPABASE_TABLE)
      .select("*")
      .order("created_at", { ascending:false });

    if (error) {
      if (table) table.innerHTML = `<tr><td colspan="6">Erro ao carregar: ${error.message}</td></tr>`;
      return;
    }

    properties = data || [];
    updateStats(properties);
    renderTable(properties);
  }

  function updateStats(list) {
    $("#totalCount") && ($("#totalCount").textContent = list.length);
    $("#saleCount") && ($("#saleCount").textContent = list.filter(p => p.negocio === "venda").length);
    $("#rentCount") && ($("#rentCount").textContent = list.filter(p => p.negocio === "aluguel").length);
    $("#featuredCount") && ($("#featuredCount").textContent = list.filter(p => p.destaque === true).length);
  }

  function renderTable(list) {
    if (!table) return;
    if (!list.length) {
      table.innerHTML = `<tr><td colspan="${document.querySelector(".catalog-table") ? 7 : 6}">Nenhum imóvel cadastrado.</td></tr>`;
      return;
    }
    const detailedTable = !!document.querySelector(".catalog-table");
    table.innerHTML = list.map(p => detailedTable ? `
      <tr>
        <td><strong>${p.codigo || "—"}</strong></td>
        <td><strong>${p.titulo || "Sem título"}</strong><br><small>${p.tipo || "-"} · ${p.negocio === "aluguel" ? "Locação" : "Venda"}</small></td>
        <td>${[p.bairro, p.cidade].filter(Boolean).join(", ") || "—"}</td>
        <td>${formatMoney(p.valor)}</td>
        <td><span class="status ${p.status === "rascunho" ? "draft" : ""}">${p.status || "-"}</span></td>
        <td>${p.destaque ? '<span class="featured-mark">DESTAQUE</span>' : '—'}</td>
        <td><div class="table-actions-cell">
          <a class="mini-btn" href="./editar-imovel.html?id=${encodeURIComponent(p.id)}">Editar</a>
          <button class="mini-btn delete-property" data-id="${p.id}" type="button">Excluir</button>
        </div></td>
      </tr>` : `
      <tr>
        <td><strong>${p.titulo || "Sem título"}</strong><br><small>${p.codigo || p.id || ""}</small></td>
        <td>${p.tipo || "-"}</td>
        <td>${p.negocio || "-"}</td>
        <td>${formatMoney(p.valor)}</td>
        <td><span class="status ${p.status === "rascunho" ? "draft" : ""}">${p.status || "-"}</span></td>
        <td><div class="table-actions-cell">
          <a class="mini-btn" href="./editar-imovel.html?id=${encodeURIComponent(p.id)}">Editar</a>
          <button class="mini-btn delete-property" data-id="${p.id}" type="button">Excluir</button>
        </div></td>
      </tr>`).join("");
    $$(".delete-property").forEach(btn => btn.addEventListener("click", () => deleteProperty(btn.dataset.id)));
  }

  async function deleteProperty(id) {

  if (!supabase || !confirm("Excluir este imóvel e todas as suas fotos?")) return;

  try {

    // 1. Buscar as fotos vinculadas ao imóvel
    const { data: fotos, error: fotosError } = await supabase
      .from("imovel_fotos")
      .select("id, storage_path")
      .eq("imovel_id", id);

    if (fotosError) {
      throw fotosError;
    }

    // 2. Pegar os caminhos dos arquivos no Storage
    const paths = (fotos || [])
      .map(foto => foto.storage_path)
      .filter(Boolean);

    // 3. Excluir as fotos físicas do Storage
    if (paths.length > 0) {

      const { error: storageError } = await supabase.storage
        .from(window.SUPABASE_BUCKET || "imoveis")
        .remove(paths);

      if (storageError) {
        throw storageError;
      }
    }

    // 4. Excluir os registros das fotos
    const { error: fotosDeleteError } = await supabase
      .from("imovel_fotos")
      .delete()
      .eq("imovel_id", id);

    if (fotosDeleteError) {
      throw fotosDeleteError;
    }

    // 5. Excluir o imóvel
    const { error: propertyError } = await supabase
      .from(window.SUPABASE_TABLE)
      .delete()
      .eq("id", id);

    if (propertyError) {
      throw propertyError;
    }

    // 6. Atualizar a lista
    alert("Imóvel e fotos excluídos com sucesso!");

    loadProperties();

  } catch (error) {

    console.error("Erro ao excluir imóvel:", error);

    alert(
      "Não foi possível excluir o imóvel.\n\n" +
      (error.message || "Erro desconhecido.")
    );

  }
}

  $("#searchProperty")?.addEventListener("input", filterTable);
  $("#statusFilter")?.addEventListener("change", filterTable);
  function filterTable() {
    const q = ($("#searchProperty")?.value || "").toLowerCase();
    const status = $("#statusFilter")?.value || "";
    renderTable(properties.filter(p =>
      (!q || `${p.titulo||""} ${p.codigo||""} ${p.tipo||""} ${p.bairro||""}`.toLowerCase().includes(q)) &&
      (!status || p.status === status)
    ));
  }

  // UPLOAD DE FOTOS E VÍDEOS
  const photoInput = $("#propertyPhotos");
  const uploadZone = $("#uploadZone");
  const preview = $("#imagePreview");
  const selectedFiles = [];

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

  function getMediaType(file) {
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "imagem";
    if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "video";
    return null;
  }

  function getExtension(file, fallback) {
    const name = String(file.name || "");
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    return ext || fallback;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addFiles(files) {
    const rejected = [];

    [...files].forEach(file => {
      const mediaType = getMediaType(file);

      if (!mediaType) {
        rejected.push(`${file.name}: formato não permitido.`);
        return;
      }

      const maxSize = mediaType === "imagem" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

      if (file.size > maxSize) {
        rejected.push(`${file.name}: acima do limite de ${mediaType === "imagem" ? "5 MB" : "50 MB"} (${formatFileSize(file.size)}).`);
        return;
      }

      selectedFiles.push(file);
    });

    renderPreviews();

    if (rejected.length) {
      message($("#propertyMessage"), rejected.slice(0, 3).join(" "), true);
    }
  }

  function renderPreviews() {
    if (!preview) return;
    preview.innerHTML = "";

    selectedFiles.forEach((file, index) => {
      const mediaType = getMediaType(file);
      const url = URL.createObjectURL(file);
      const item = document.createElement("div");
      item.className = "image-preview";

      const media = mediaType === "video"
        ? `<video src="${url}" muted playsinline controls preload="metadata"></video>`
        : `<img src="${url}" alt="Foto ${index + 1}">`;

      item.innerHTML = `
        ${media}
        <span class="media-type">${mediaType === "video" ? "VÍDEO" : "FOTO"}</span>
        <span class="main-photo">${index === 0 ? "PRIMEIRA MÍDIA" : `MÍDIA ${index + 1}`}</span>
        <span class="media-name">${file.name}</span>
        <button type="button" aria-label="Remover mídia">×</button>
      `;

      item.querySelector("button").onclick = () => {
        URL.revokeObjectURL(url);
        selectedFiles.splice(index, 1);
        renderPreviews();
      };

      preview.appendChild(item);
    });
  }

  $("#selectPhotos")?.addEventListener("click", e => {
    e.stopPropagation();
    photoInput?.click();
  });


  photoInput?.addEventListener("change", e => {
    addFiles(e.target.files);
    e.target.value = "";
  });

  ["dragenter", "dragover"].forEach(ev => uploadZone?.addEventListener(ev, e => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  }));

  ["dragleave", "drop"].forEach(ev => uploadZone?.addEventListener(ev, e => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
  }));

  uploadZone?.addEventListener("drop", e => addFiles(e.dataTransfer.files));

  function compressImage(file, size = 1080, quality = .78) {
    return new Promise((resolve, reject) => {
      if (file.type === "image/heic") {
        resolve(file);
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
          const scale = Math.max(size / img.width, size / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const x = (size - drawW) / 2;
          const y = (size - drawH) / 2;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, x, y, drawW, drawH);

          canvas.toBlob(
            blob => blob ? resolve(blob) : reject(new Error("Falha na compressão da imagem.")),
            "image/webp",
            quality
          );
        };

        img.onerror = () => reject(new Error(`Não foi possível ler a imagem "${file.name}".`));
        img.src = reader.result;
      };

      reader.onerror = () => reject(new Error(`Não foi possível ler "${file.name}".`));
      reader.readAsDataURL(file);
    });
  }

  async function uploadPhotos(propertyId) {
    if (!selectedFiles.length) return [];

    const uploaded = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const original = selectedFiles[i];
        const mediaType = getMediaType(original);
        const maxSize = mediaType === "imagem" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

        if (!mediaType) throw new Error(`Formato não permitido: ${original.name}`);
        if (original.size > maxSize) {
          throw new Error(`${original.name} ultrapassa o limite de ${mediaType === "imagem" ? "5 MB" : "50 MB"}.`);
        }

        let uploadFile = original;
        let extension = getExtension(original, mediaType === "video" ? "mp4" : "jpg");
        let contentType = original.type || (mediaType === "video" ? "video/mp4" : "image/jpeg");

        if (mediaType === "imagem" && original.type !== "image/heic") {
          uploadFile = await compressImage(original);
          extension = uploadFile === original ? "jpg" : "webp";
          contentType = uploadFile === original ? "image/jpeg" : "image/webp";
        }

        const safeName = slugify(original.name.replace(/\.[^/.]+$/, "")) || mediaType;
        const fileName = `${propertyId}/${Date.now()}-${i}-${safeName}.${extension}`;

        const { error } = await supabase.storage
          .from(window.SUPABASE_BUCKET)
          .upload(fileName, uploadFile, { contentType, upsert: false });

        if (error) throw error;

        const { data } = supabase.storage
          .from(window.SUPABASE_BUCKET)
          .getPublicUrl(fileName);

        uploaded.push({
          url: data.publicUrl,
          ordem: i,
          path: fileName,
          tipo_midia: mediaType,
          principal: false
        });
      }

      const firstImage = uploaded.find(item => item.tipo_midia === "imagem");
      if (firstImage) firstImage.principal = true;
      else if (uploaded[0]) uploaded[0].principal = true;

      return uploaded;
    } catch (error) {
      if (uploaded.length) {
        await supabase.storage
          .from(window.SUPABASE_BUCKET)
          .remove(uploaded.map(item => item.path))
          .catch(() => {});
      }
      throw error;
    }
  }

  // CEP / VIA CEP + localização
  const adminMaps = new WeakMap();

  function buildAddress(form) {
    const value = name => String(form?.elements?.[name]?.value || '').trim();
    return [
      value('rua') && value('numero') ? `${value('rua')}, ${value('numero')}` : value('rua'),
      value('bairro'), value('cidade'), value('estado'), value('cep')
    ].filter(Boolean).join(', ');
  }

  function setupAddressMap(form, mapId, linkId, statusId) {
    if (!form) return;
    const mapEl = document.getElementById(mapId);
    const link = document.getElementById(linkId);
    const status = document.getElementById(statusId);
    if (!mapEl || !link || !status) return;

    let timer;
    let lastQuery = '';

    const clearMap = () => {
      clearTimeout(timer);
      lastQuery = '';
      mapEl.hidden = true;
      link.hidden = true;
      link.removeAttribute('href');
      status.textContent = 'Preencha o CEP e o endereço para visualizar a localização.';
      if (adminMaps.has(form)) {
        try { adminMaps.get(form).remove(); } catch (_) {}
        adminMaps.delete(form);
      }
    };

    const geocode = async () => {
      const query = buildAddress(form);
      if (!query || query === lastQuery) return;
      lastQuery = query;
      link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      link.hidden = false;
      status.textContent = 'Localizando o endereço...';

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`, {
          headers: { Accept: 'application/json' }
        });
        const results = await response.json();
        if (!results.length) throw new Error('Localização não encontrada');

        const lat = Number(results[0].lat);
        const lon = Number(results[0].lon);
        mapEl.hidden = false;
        status.textContent = 'Confira a posição no mapa. Para uma segunda conferência, use o Google Maps.';

        if (!window.L) throw new Error('Mapa indisponível');
        if (adminMaps.has(form)) {
          try { adminMaps.get(form).remove(); } catch (_) {}
        }
        const map = L.map(mapEl, { scrollWheelZoom: false }).setView([lat, lon], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        L.marker([lat, lon]).addTo(map).bindPopup('<strong>Localização do imóvel</strong>').openPopup();
        adminMaps.set(form, map);
        setTimeout(() => map.invalidateSize(), 100);
      } catch (error) {
        console.warn('Localização não encontrada:', error);
        mapEl.hidden = true;
        status.textContent = 'Não foi possível localizar automaticamente. Confira o endereço ou use o Google Maps para verificar.';
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(geocode, 500);
    };

    ['cep','rua','numero','bairro','cidade','estado'].forEach(name => {
      const field = form.elements[name];
      field?.addEventListener('input', schedule);
      field?.addEventListener('change', schedule);
    });

    form._vinholiGeocode = geocode;
    form._vinholiClearMap = clearMap;
  }

  function setupCepLookup(form) {
    const cep = form?.elements?.cep;
    if (!cep) return;

    let lastCep = '';
    let lookupTimer;
    const lookup = async () => {
      const clean = String(cep.value || '').replace(/\D/g, '');
      if (!clean.length) {
        ['estado','cidade','bairro','rua'].forEach(name => { if (form.elements[name]) form.elements[name].value = ''; });
        form._vinholiClearMap?.();
        return;
      }
      if (clean.length !== 8 || clean === lastCep) return;
      lastCep = clean;
      cep.value = `${clean.slice(0,5)}-${clean.slice(5)}`;

      try {
        const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        if (!response.ok) throw new Error('Falha na consulta');
        const data = await response.json();
        if (data.erro) throw new Error('CEP não encontrado');
        if (form.elements.estado) form.elements.estado.value = data.uf || '';
        if (form.elements.cidade) form.elements.cidade.value = data.localidade || '';
        if (form.elements.bairro) form.elements.bairro.value = data.bairro || '';
        if (form.elements.rua) form.elements.rua.value = data.logradouro || '';
        form._vinholiGeocode?.();
        message(form.querySelector('.form-message'), 'Endereço preenchido pelo CEP.');
      } catch (error) {
        console.warn('CEP não localizado:', error);
        message(form.querySelector('.form-message'), 'CEP não encontrado. Confira os dados do endereço.', true);
      }
    };

    cep.addEventListener('input', () => {
      const clean = cep.value.replace(/\D/g, '').slice(0, 8);
      cep.value = clean.length > 5 ? `${clean.slice(0,5)}-${clean.slice(5)}` : clean;
      if (!clean.length) {
        lastCep = '';
        ['estado','cidade','bairro','rua'].forEach(name => { if (form.elements[name]) form.elements[name].value = ''; });
        form._vinholiClearMap?.();
      } else if (clean.length === 8) {
        clearTimeout(lookupTimer);
        lookupTimer = setTimeout(lookup, 250);
      } else {
        lastCep = '';
      }
    });
    cep.addEventListener('blur', lookup);
    cep.addEventListener('change', lookup);
  }

  async function generateNextCodigo() {
    if (!supabase) return "";
    const { data, error } = await supabase
      .from(window.SUPABASE_TABLE)
      .select("codigo")
      .not("codigo", "is", null);

    if (error) throw error;

    let max = 0;
    (data || []).forEach(item => {
      const match = String(item.codigo || "").trim().match(/^VH(\d+)$/i);
      if (match) max = Math.max(max, Number(match[1]));
    });

    return `VH${String(max + 1).padStart(3, "0")}`;
  }

  async function prepareNewPropertyForm() {
    const form = $("#propertyForm");
    if (!form || !supabase) return;
    try {
      if (form.elements.codigo) form.elements.codigo.value = await generateNextCodigo();
    } catch (error) {
      console.warn("Não foi possível gerar o código automaticamente:", error);
    }
  }

  function validateShortsUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      const isShorts = (host === 'youtube.com' || host === 'm.youtube.com') && url.pathname.startsWith('/shorts/');
      const isShortLink = host === 'youtu.be' && url.pathname.split('/').filter(Boolean).length === 1;
      if (!isShorts && !isShortLink) throw new Error('Informe apenas um link do YouTube Shorts.');
      return raw;
    } catch (error) {
      if (error.message.includes('YouTube Shorts')) throw error;
      throw new Error('Informe um link válido do YouTube Shorts.');
    }
  }

  // NOVO IMÓVEL
  const propertyForm = $("#propertyForm");
  propertyForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#propertyMessage");
    if (!supabase) return message(msg, "Não foi possível salvar o imóvel no momento. Tente novamente.", true);
    if (propertyForm.elements.status.value === "publicado" && !propertyForm.elements.aceite.checked) {
      return message(msg, "Confirme que as informações estão corretas antes de publicar.", true);
    }

    const btn = propertyForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
      const f = new FormData(propertyForm);
      const payload = {
        codigo: f.get("codigo") || null,
        titulo: f.get("titulo"),
        descricao: f.get("descricao") || null,
        caracteristicas: f.get("caracteristicas") || null,
        proximidades: f.get("proximidades") || null,
        video_url: validateShortsUrl(f.get("video_url")),
        tipo: f.get("tipo"),
        negocio: f.get("negocio"),
        valor: moneyToNumber(f.get("valor")),
        condominio: moneyToNumber(f.get("condominio")),
        iptu: moneyToNumber(f.get("iptu")),
        cep: f.get("cep") || null,
        estado: f.get("estado") || null,
        cidade: f.get("cidade") || null,
        bairro: f.get("bairro") || null,
        rua: f.get("rua") || null,
        numero: f.get("numero") || null,
        complemento: f.get("complemento") || null,
        mostrar_endereco: f.get("mostrar_endereco") === "true",
        quartos: Number(f.get("quartos") || 0),
        suites: Number(f.get("suites") || 0),
        banheiros: Number(f.get("banheiros") || 0),
        vagas: Number(f.get("vagas") || 0),
        area_util: Number(f.get("area_util") || 0),
        area_construida: Number(f.get("area_construida") || 0),
        area_terreno: Number(f.get("area_terreno") || 0),
        status: f.get("status"),
        destaque: f.get("destaque") === "true"
      };

      const { data, error } = await supabase.from(window.SUPABASE_TABLE).insert(payload).select().single();
      if (error) throw error;

      const photos = await uploadPhotos(data.id);
      if (photos.length) {
        const { error: photoError } = await supabase.from("imovel_fotos").insert(
          photos.map(photo => ({
            imovel_id: data.id,
            url: photo.url,
            storage_path: photo.path,
            ordem: photo.ordem,
            principal: photo.principal,
            tipo_midia: photo.tipo_midia
          }))
        );

        if (photoError) {
          await supabase.storage
            .from(window.SUPABASE_BUCKET)
            .remove(photos.map(photo => photo.path))
            .catch(() => {});
          throw photoError;
        }
      }

      message(msg, "Imóvel cadastrado com sucesso.");
      propertyForm.reset();
      selectedFiles.length = 0;
      renderPreviews();
      setTimeout(() => location.href="./dashboard.html", 900);
    } catch (err) {
      console.error(err);
      message(msg, err.message || "Não foi possível salvar o imóvel.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Salvar anúncio";
    }
  });

  $$(".money").forEach(input => input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g,"");
    input.value = digits ? (Number(digits)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "";
  }));

  if (table || $("#totalCount")) loadProperties();

  setupAddressMap($("#propertyForm"), "newPropertyMap", "newMapsLink", "newMapStatus");
  setupAddressMap($("#editPropertyForm"), "editPropertyMap", "editMapsLink", "editMapStatus");
  setupCepLookup($("#propertyForm"));
  setupCepLookup($("#editPropertyForm"));
  if (propertyForm) {
    requireAuth().then(prepareNewPropertyForm);
  }
  /* =========================================================
   EDITAR IMÓVEL
   ========================================================= */

async function loadEditProperty() {

  const form = $("#editPropertyForm");

  // Se não estamos na página de edição, não faz nada
  if (!form) return;

  // Verifica se o usuário está logado
  const authenticated = await requireAuth();

  if (!authenticated) return;

  if (!supabase) {
    return message(
      $("#editMessage"),
      "O sistema ainda não está configurado. Entre em contato com o suporte.",
      true
    );
  }

  // Pega o ID que veio na URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  console.log("ID do imóvel para edição:", id);

  if (!id) {

    return message(
      $("#editMessage"),
      "ID do imóvel não encontrado na URL.",
      true
    );
  }

  // Busca o imóvel no Supabase
  const { data: imovel, error } = await supabase
    .from(window.SUPABASE_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {

    console.error("Erro ao buscar imóvel:", error);

    return message(
      $("#editMessage"),
      "Não foi possível carregar o imóvel: " + error.message,
      true
    );
  }

  if (!imovel) {

    return message(
      $("#editMessage"),
      "Imóvel não encontrado.",
      true
    );
  }

  console.log("Imóvel carregado:", imovel);

  // Preenche o formulário
  preencherFormularioEdicao(form, imovel);
}


/* =========================================================
   PREENCHER FORMULÁRIO
   ========================================================= */

function preencherFormularioEdicao(form, imovel) {

  // Campos de texto, select e números
  const campos = [
    "negocio",
    "tipo",
    "codigo",
    "titulo",
    "descricao",
    "caracteristicas",
    "proximidades",
    "video_url",
    "cep",
    "estado",
    "cidade",
    "bairro",
    "rua",
    "numero",
    "complemento",
    "quartos",
    "suites",
    "banheiros",
    "vagas",
    "area_util",
    "area_construida",
    "area_terreno",
    "status"
  ];

  campos.forEach(campo => {

    const elemento = form.elements[campo];

    if (!elemento) return;

    elemento.value = imovel[campo] ?? "";

  });


  // Atualiza a localização exibida no formulário
  setTimeout(() => form._vinholiGeocode?.(), 150);

  // Select mostrar endereço
  if (form.elements.mostrar_endereco) {

    form.elements.mostrar_endereco.value =
      imovel.mostrar_endereco ? "true" : "false";

  }


  // Select destaque
  if (form.elements.destaque) {

    form.elements.destaque.value =
      imovel.destaque ? "true" : "false";

  }


  // Valores monetários
  if (form.elements.valor) {

    form.elements.valor.value =
      imovel.valor
        ? formatMoney(imovel.valor)
        : "";

  }


  if (form.elements.condominio) {

    form.elements.condominio.value =
      imovel.condominio
        ? formatMoney(imovel.condominio)
        : "";

  }


  if (form.elements.iptu) {

    form.elements.iptu.value =
      imovel.iptu
        ? formatMoney(imovel.iptu)
        : "";

  }
}


/* =========================================================
   SALVAR ALTERAÇÕES
   ========================================================= */

async function saveEditProperty(event) {

  event.preventDefault();

  const form = event.currentTarget;

  const params =
    new URLSearchParams(window.location.search);

  const id = params.get("id");

  if (!id) {

    return message(
      $("#editMessage"),
      "ID do imóvel não encontrado.",
      true
    );

  }


  const f = new FormData(form);

  if (f.get("status") === "publicado" && !form.elements.aceite?.checked) {
    return message($("#editMessage"), "Confirme que as informações estão corretas antes de publicar.", true);
  }

  const btn =
    form.querySelector('button[type="submit"]');


  btn.disabled = true;

  btn.textContent =
    "Salvando alterações...";


  try {

    const payload = {

      codigo:
        f.get("codigo") || null,

      titulo:
        f.get("titulo"),

      descricao:
        f.get("descricao") || null,

      caracteristicas:
        f.get("caracteristicas") || null,

      proximidades:
        f.get("proximidades") || null,

      video_url:
        validateShortsUrl(f.get("video_url")),

      tipo:
        f.get("tipo"),

      negocio:
        f.get("negocio"),

      valor:
        moneyToNumber(f.get("valor")),

      condominio:
        moneyToNumber(f.get("condominio")),

      iptu:
        moneyToNumber(f.get("iptu")),

      cep:
        f.get("cep") || null,

      estado:
        f.get("estado") || null,

      cidade:
        f.get("cidade") || null,

      bairro:
        f.get("bairro") || null,

      rua:
        f.get("rua") || null,

      numero:
        f.get("numero") || null,

      complemento:
        f.get("complemento") || null,

      mostrar_endereco:
        f.get("mostrar_endereco") === "true",

      quartos:
        Number(f.get("quartos") || 0),

      suites:
        Number(f.get("suites") || 0),

      banheiros:
        Number(f.get("banheiros") || 0),

      vagas:
        Number(f.get("vagas") || 0),

      area_util:
        Number(f.get("area_util") || 0),

      area_construida:
        Number(f.get("area_construida") || 0),

      area_terreno:
        Number(f.get("area_terreno") || 0),

      status:
        f.get("status"),

      destaque:
        f.get("destaque") === "true"

    };


    console.log(
      "Dados que serão atualizados:",
      payload
    );


    const { error } =
      await supabase
        .from(window.SUPABASE_TABLE)
        .update(payload)
        .eq("id", id);


    if (error) {

      console.error(
        "Erro ao atualizar:",
        error
      );

      throw error;

    }


    message(
      $("#editMessage"),
      "Imóvel atualizado com sucesso."
    );


    // Volta para o dashboard
    setTimeout(() => {

      window.location.href =
        "./dashboard.html";

    }, 1000);


  } catch (error) {

    console.error(error);

    message(
      $("#editMessage"),
      "Erro ao salvar: " +
      (error.message || "erro desconhecido"),
      true
    );


    btn.disabled = false;

    btn.textContent =
      "Salvar alterações";

  }

}


/* =========================================================
   INICIALIZAÇÃO DA PÁGINA DE EDIÇÃO
   ========================================================= */

const editForm =
  $("#editPropertyForm");


if (editForm) {
  // Carrega os dados do imóvel
  loadEditProperty();

  // Salva as alterações
  editForm.addEventListener(
    "submit",
    saveEditProperty
  );
}

})();