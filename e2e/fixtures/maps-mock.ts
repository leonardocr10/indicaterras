import type { Page, Route } from '@playwright/test';

/**
 * Item 6: o mapa precisa ser testavel sem a API do Google.
 *
 * Em vez de esconder o mapa, servimos um SDK falso no lugar do script real. Ele
 * implementa exatamente o que `ProfessionalsPageComponent` usa - `Map`,
 * `Marker`, `LatLng`, `LatLngBounds`, `InfoWindow` e `OverlayView` - e o
 * `OverlayView` insere os marcadores no DOM de verdade.
 *
 * Isso importa: os pinos do app sao `<button class="map-pin">` construidos pelo
 * proprio componente, com `aria-label` e listener de clique. Com este stub eles
 * existem na pagina, entao o teste clica no marcador de verdade e valida o card
 * que abre - em vez de conferir que "o mapa carregou".
 */

const URL_SDK = 'https://maps.googleapis.com/maps/api/js*';

/** O loader so injeta o script se `public-settings` devolver uma chave. */
async function garantirChaveNasConfiguracoes(page: Page) {
  await page.route('**/api/public-settings', async (rota: Route) => {
    const resposta = await rota.fetch();
    const corpo = await resposta.json().catch(() => null);
    if (!corpo?.data) return rota.fulfill({ response: resposta });
    corpo.data.maps = { apiKey: 'chave-falsa-e2e' };
    await rota.fulfill({ response: resposta, body: JSON.stringify(corpo) });
  });
}

const SDK_FALSO = `
(function () {
  function despachar(alvo, evento) {
    (alvo.__ouvintes && alvo.__ouvintes[evento] || []).forEach(function (cb) { cb(); });
  }

  function Base() { this.__ouvintes = {}; }
  Base.prototype.addListener = function (evento, callback) {
    (this.__ouvintes[evento] = this.__ouvintes[evento] || []).push(callback);
    return { remove: function () {} };
  };

  function LatLng(lat, lng) { this.lat = lat; this.lng = lng; }
  LatLng.prototype.lat = function () { return this.lat; };
  LatLng.prototype.lng = function () { return this.lng; };

  function LatLngBounds() { this.pontos = []; }
  LatLngBounds.prototype.extend = function (ponto) { this.pontos.push(ponto); return this; };

  function Map(elemento, opcoes) {
    Base.call(this);
    this.elemento = elemento;
    this.opcoes = opcoes || {};
    this.zoom = this.opcoes.zoom || 13;
    this.centro = this.opcoes.center || { lat: 0, lng: 0 };
    // Camada onde o OverlayView deposita os marcadores. O componente estiliza
    // .map-pin por conta propria, entao basta existir um container posicionado.
    this.painel = document.createElement('div');
    this.painel.className = 'e2e-fake-map-pane';
    this.painel.style.position = 'absolute';
    this.painel.style.inset = '0';
    elemento.style.position = elemento.style.position || 'relative';
    elemento.appendChild(this.painel);
    elemento.setAttribute('data-e2e-map', 'pronto');
  }
  Map.prototype = Object.create(Base.prototype);
  Map.prototype.setCenter = function (ponto) { this.centro = ponto; };
  Map.prototype.getCenter = function () { return this.centro; };
  Map.prototype.setZoom = function (valor) { this.zoom = valor; despachar(this, 'zoom_changed'); };
  Map.prototype.getZoom = function () { return this.zoom; };
  Map.prototype.fitBounds = function () { this.setZoom(13); };

  function Marker(opcoes) {
    Base.call(this);
    this.opcoes = opcoes || {};
    this.mapa = this.opcoes.map || null;
  }
  Marker.prototype = Object.create(Base.prototype);
  Marker.prototype.setMap = function (mapa) { this.mapa = mapa; };
  Marker.prototype.getPosition = function () { return this.opcoes.position; };

  function InfoWindow(opcoes) { this.opcoes = opcoes || {}; }
  InfoWindow.prototype.open = function () {};
  InfoWindow.prototype.close = function () {};

  // OverlayView e o que realmente importa: o app estende esta classe para criar
  // o marcador HTML. Chamamos onAdd/draw na hora do setMap para que o botao
  // apareca no DOM imediatamente, sem esperar ciclo de render do mapa real.
  function OverlayView() { this.__mapa = null; }
  OverlayView.prototype.setMap = function (mapa) {
    this.__mapa = mapa;
    if (mapa) {
      if (this.onAdd) this.onAdd();
      if (this.draw) this.draw();
    } else if (this.onRemove) {
      this.onRemove();
    }
  };
  OverlayView.prototype.getMap = function () { return this.__mapa; };
  OverlayView.prototype.getPanes = function () {
    var painel = this.__mapa ? this.__mapa.painel : document.body;
    return { floatPane: painel, overlayMouseTarget: painel, markerLayer: painel, overlayLayer: painel };
  };
  OverlayView.prototype.getProjection = function () {
    // Projecao linear simples: o suficiente para posicionar os pinos de forma
    // deterministica. O teste valida presenca e clique, nao pixel exato.
    return {
      fromLatLngToDivPixel: function (posicao) {
        var lat = typeof posicao.lat === 'function' ? posicao.lat() : posicao.lat;
        var lng = typeof posicao.lng === 'function' ? posicao.lng() : posicao.lng;
        return { x: Math.round((lng + 180) * 10) % 400, y: Math.round((90 - lat) * 10) % 400 };
      },
    };
  };

  window.google = window.google || {};
  window.google.maps = {
    Map: Map,
    Marker: Marker,
    InfoWindow: InfoWindow,
    LatLng: LatLng,
    LatLngBounds: LatLngBounds,
    OverlayView: OverlayView,
    importLibrary: function () { return Promise.resolve(window.google.maps); },
    event: { addListener: function (alvo, evento, cb) { return alvo.addListener(evento, cb); } },
  };
  window.__e2eMapsMock = true;
})();
`;

/** Substitui o SDK do Google por um stub funcional. */
export async function mockGoogleMaps(page: Page) {
  await garantirChaveNasConfiguracoes(page);
  await page.route(URL_SDK, async (rota: Route) => {
    await rota.fulfill({ status: 200, contentType: 'application/javascript', body: SDK_FALSO });
  });
}

/**
 * Simula o SDK indisponivel (sem chave, sem faturamento, offline). A tela deve
 * degradar para a lista, nunca ficar num retangulo branco sem explicacao.
 */
export async function mockGoogleMapsIndisponivel(page: Page) {
  await garantirChaveNasConfiguracoes(page);
  await page.route(URL_SDK, (rota: Route) => rota.abort('failed'));
}

/** Simula a chave recusada pelo Google (gm_authFailure). */
export async function mockGoogleMapsChaveRecusada(page: Page) {
  await garantirChaveNasConfiguracoes(page);
  await page.route(URL_SDK, async (rota: Route) => {
    await rota.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `${SDK_FALSO}\nif (window.gm_authFailure) window.gm_authFailure();`,
    });
  });
}
