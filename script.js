// script.js
// SPA escolar de Aerolíneas Mariani: navegación, vuelos, reservas, sesión y check-in simulados.

const rutas = ["/", "/perfil", "/reservas", "/buscar", "/checkin", "/pagos", "/detalle"];
const titulosRuta = {
  "/": "Aerolíneas Mariani",
  "/perfil": "Aerolíneas Mariani | Mi Perfil",
  "/reservas": "Aerolíneas Mariani | Mis Reservas",
  "/buscar": "Aerolíneas Mariani | Buscar vuelos",
  "/checkin": "Aerolíneas Mariani | Check-in",
  "/pagos": "Aerolíneas Mariani | Pagos",
  "/detalle": "Aerolíneas Mariani | Detalle del vuelo"
};

const CLAVES = {
  cuentas: "amarianiAccountsV2",
  sesion: "amarianiSessionV2",
  reserva: "amarianiBookingV2",
  checkins: "amarianiCheckinsV2",
  reservas: "amarianiBookingsV3"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const pantallas = $$(".view");
const enlacesMenu = $$(".nav-link");
const menu = $(".nav-links");
const botonMenu = $(".hamburger");
const panelResultados = $("#resultsPanel");
const listaResultados = $("#resultsList");
const introResultados = $("#resultsIntro");
const detalleVuelo = $("#flightDetail");
const resumenReserva = $("#bookingSummary");
const modalAcceso = $("#authModal");
const nombreUsuario = $("#userChip");
const aviso = $("#toast");

const perfilDemo = {
  firstName: "Simón",
  lastName: "Mariani",
  dni: "48.123.456",
  birthDate: "2010-03-12",
  email: "simon@mariani.com",
  phone: "+54 9 11 6765 1321",
  address: "Calle 145 entre 47 y 48 número 1449",
  nationality: "Argentina"
};

const vuelosBase = [
  {
    id: "AM-401",
    number: "AM 401",
    cabin: "Económica Plus",
    departure: "08:20",
    arrival: "10:35",
    duration: "2 h 15 min",
    stops: "Directo",
    aircraft: "Airbus A320 Neo",
    seat: "12A incluido",
    seatNumber: "12A",
    baggage: "1 bolso + carry-on + 1 valija de 23 kg",
    price: 148900,
    availableSeats: 34,
    status: "En horario",
    miles: 1860,
    gate: "7A - Libertad",
    terminal: "Aeroparque Jorge Newbery"
  },
  {
    id: "AM-733",
    number: "AM 733",
    cabin: "Flex",
    departure: "14:35",
    arrival: "16:50",
    duration: "2 h 15 min",
    stops: "Directo",
    aircraft: "Boeing 737-800",
    seat: "Selección estándar incluida",
    seatNumber: "12A",
    baggage: "1 de mano incluido + 1 para despachar (23 kg)",
    price: 169500,
    availableSeats: 18,
    status: "En horario",
    miles: 2140,
    gate: "7A - Libertad",
    terminal: "Aeroparque Jorge Newbery"
  },
  {
    id: "AM-915",
    number: "AM 915",
    cabin: "Gold Priority",
    departure: "20:10",
    arrival: "22:20",
    duration: "2 h 10 min",
    stops: "Directo",
    aircraft: "Airbus A321",
    seat: "Filas delanteras",
    seatNumber: "4C",
    baggage: "Carry-on + 2 valijas de 23 kg",
    price: 221400,
    availableSeats: 9,
    status: "Programado",
    miles: 2900,
    gate: "9B - Andes",
    terminal: "Aeroparque Jorge Newbery"
  }
];

function leerJSON(clave, respaldo) {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? JSON.parse(guardado) : respaldo;
  } catch (error) {
    return respaldo;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    return false;
  }
}

function guardarTexto(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch (error) {
    // La interfaz continúa funcionando aunque el navegador bloquee el almacenamiento local.
  }
}

function borrarClave(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (error) {
    // Sin acción: la sesión en memoria igualmente se cierra.
  }
}

let cuentas = leerJSON(CLAVES.cuentas, []);
if (!Array.isArray(cuentas)) cuentas = [];

const emailSesion = (() => {
  try {
    return localStorage.getItem(CLAVES.sesion) || "";
  } catch (error) {
    return "";
  }
})();

let usuarioActual = cuentas.find((cuenta) => cuenta.email === emailSesion) || null;
let vuelosMostrados = [];
let vueloElegido = null;
let reservaPendienteTrasLogin = false;
let temporizadorAviso = null;
let focoAntesDelAcceso = null;
let codigoReservaActual = "";
let metodoPago = "";
let reservas = leerJSON(CLAVES.reservas, null);
// Recuperamos la reserva anterior sin borrar sus datos ni su código.
if (!Array.isArray(reservas)) {
  const anterior = leerJSON(CLAVES.reserva, null);
  reservas = anterior && !anterior.demo && anterior.ownerEmail ? [anterior] : [];
  const checkinsAnteriores = leerJSON(CLAVES.checkins, {}) || {};
  reservas.forEach((reserva) => {
    reserva.checkinStatus = checkinsAnteriores[claveCheckin(reserva)] || reserva.checkinStatus || "Pendiente";
  });
}

function rutaValida(ruta) {
  return rutas.includes(ruta) ? ruta : "/";
}

function obtenerRutaActual() {
  return rutaValida(location.hash.replace(/^#/, "") || location.pathname);
}

function cerrarMenu() {
  menu.classList.remove("open");
  botonMenu.setAttribute("aria-expanded", "false");
  botonMenu.setAttribute("aria-label", "Abrir menú");
}

function escribirRuta(ruta, reemplazar) {
  const destino = "#" + ruta;
  if (location.hash === destino) return;
  try {
    if (reemplazar) history.replaceState({ route: ruta }, "", destino);
    else history.pushState({ route: ruta }, "", destino);
  } catch (error) {
    location.hash = destino;
  }
}

function mostrarPantalla(ruta, reemplazar = false) {
  const rutaActual = rutaValida(ruta);

  actualizarPerfil();
  actualizarReserva();
  actualizarCheckin();
  actualizarPagos();
  if (rutaActual !== "/perfil") cerrarEditorPerfil();

  pantallas.forEach((pantalla) => {
    pantalla.classList.toggle("active", pantalla.dataset.view === rutaActual);
  });

  const rutaMenu = rutaActual === "/detalle" ? "/buscar" : rutaActual;
  enlacesMenu.forEach((enlace) => {
    enlace.classList.toggle("active", enlace.dataset.route === rutaMenu);
    if (enlace.dataset.route === rutaMenu) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  });

  document.title = titulosRuta[rutaActual];
  escribirRuta(rutaActual, reemplazar);
  cerrarMenu();
  window.scrollTo({ top: 0, behavior: reemplazar ? "auto" : "smooth" });
}

function precio(pesos) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(pesos) || 0);
}

function fechaLegible(fecha, formatoLargo = false) {
  if (!fecha) return "Sin informar";
  const valor = new Date(fecha + "T12:00:00");
  if (Number.isNaN(valor.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: formatoLargo ? "long" : "short",
    year: "numeric"
  }).format(valor);
}

function escaparHTML(valor) {
  const equivalencias = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  };
  return String(valor).replace(/[&<>"']/g, (caracter) => equivalencias[caracter]);
}

function nombreCompleto(usuario) {
  return [usuario.firstName, usuario.lastName].filter(Boolean).join(" ").trim();
}

function iniciales(usuario) {
  return [usuario.firstName, usuario.lastName]
    .filter(Boolean)
    .map((parte) => parte.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AM";
}

function ponerTexto(selector, texto) {
  const elemento = $(selector);
  if (elemento) elemento.textContent = texto;
}

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.classList.add("show");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("show"), 3300);
}

function actualizarSesion() {
  document.body.classList.toggle("logged-in", Boolean(usuarioActual));
  nombreUsuario.textContent = usuarioActual ? usuarioActual.firstName : "Mi cuenta";

  if (usuarioActual) {
    guardarTexto(CLAVES.sesion, usuarioActual.email);
  } else {
    borrarClave(CLAVES.sesion);
  }

  actualizarPerfil();
  actualizarReserva();
  actualizarCheckin();
  actualizarPagos();
}

function actualizarPerfil() {
  const perfil = usuarioActual || perfilDemo;
  ponerTexto("#profileAvatar", iniciales(perfil));
  ponerTexto("#profileFullName", nombreCompleto(perfil));
  ponerTexto("#profileFirstName", perfil.firstName || "Sin informar");
  ponerTexto("#profileLastName", perfil.lastName || "Sin informar");
  ponerTexto("#profileDni", perfil.dni || "Sin informar");
  ponerTexto("#profileBirthDate", fechaLegible(perfil.birthDate, true));
  ponerTexto("#profileEmail", perfil.email || "Sin informar");
  ponerTexto("#profilePhone", perfil.phone || "Sin informar");
  ponerTexto("#profileAddress", perfil.address || "Sin informar");
  ponerTexto("#profileNationality", perfil.nationality || "Sin informar");

  if (usuarioActual) {
    ponerTexto("#profileModeBadge", "Datos de la sesión");
    const alta = usuarioActual.createdAt
      ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" })
          .format(new Date(usuarioActual.createdAt))
      : "esta sesión";
    ponerTexto("#profileSince", "Cuenta simulada registrada el " + alta);
  } else {
    ponerTexto("#profileModeBadge", "Datos de demostración");
    ponerTexto("#profileSince", "Perfil demostrativo de la maqueta");
  }
}

// Una reserva corresponde a un pasajero y un tramo.
// La disponibilidad se calcula restando las reservas confirmadas al cupo original.
function misReservas() {
  return usuarioActual ? reservas.filter((reserva) => reserva.ownerEmail === usuarioActual.email) : [];
}

function obtenerReservaActual() {
  const propias = misReservas();
  return propias.find((reserva) => reserva.code === codigoReservaActual) || propias[propias.length - 1] || null;
}

function claveCheckin(reserva) {
  return (reserva.ownerEmail || "demo-public") + "::" + reserva.code;
}

function estadoCheckin(reserva) {
  return reserva ? reserva.checkinStatus || "Pendiente" : "Sin reserva";
}

function claveVuelo(vuelo) {
  return [vuelo.id || vuelo.number.replace(/\s/g, "-"), normalizarCiudad(vuelo.origin),
    normalizarCiudad(vuelo.destination), vuelo.departureDate].join("|");
}

function asientosDisponibles(vuelo) {
  const base = vuelosBase.find((item) => item.id === vuelo.id || item.number === vuelo.number);
  if (!base) return 0;
  const ocupados = reservas.filter((reserva) =>
    reserva.reservationStatus === "Confirmada" &&
    (reserva.flightKey || claveVuelo(reserva)) === claveVuelo(vuelo)).length;
  return Math.max(0, base.availableSeats - ocupados);
}

function asignarAsiento(vuelo, nuevasReservas) {
  const base = vuelosBase.find((item) => item.id === vuelo.id);
  const filaInicial = Number(base.seatNumber.match(/\d+/)[0]);
  const letras = "ABCDEF";
  const letraInicial = letras.indexOf(base.seatNumber.slice(-1));
  const ocupados = reservas.concat(nuevasReservas)
    .filter((reserva) => (reserva.flightKey || claveVuelo(reserva)) === claveVuelo(vuelo))
    .map((reserva) => reserva.seat);
  let posicion = letraInicial;
  let asiento = filaInicial + letras[posicion];
  while (ocupados.includes(asiento)) {
    posicion += 1;
    asiento = (filaInicial + Math.floor(posicion / 6)) + letras[posicion % 6];
  }
  return asiento;
}

function aplicarClaseEstado(elemento, realizado) {
  if (elemento) elemento.classList.toggle("pending", !realizado);
}

function actualizarSelectores() {
  const propias = misReservas();
  const actual = obtenerReservaActual();
  codigoReservaActual = actual ? actual.code : "";
  ["booking", "payment", "checkin"].forEach((prefijo) => {
    $("#" + prefijo + "Picker").hidden = propias.length === 0;
    const selector = $("#" + prefijo + "Select");
    selector.innerHTML = propias.map((reserva) =>
      '<option value="' + escaparHTML(reserva.code) + '">' +
      escaparHTML(reserva.code + " · " + reserva.passenger + " · " +
      reserva.origin + " → " + reserva.destination + " · " + fechaLegible(reserva.departureDate)) +
      "</option>").join("");
    selector.value = codigoReservaActual;
  });
}

function actualizarReserva() {
  actualizarSelectores();
  const reserva = obtenerReservaActual();
  $("#bookingEmpty").hidden = Boolean(reserva);
  $("#bookingCard").hidden = !reserva;
  if (!reserva) return;

  const realizado = estadoCheckin(reserva) === "Realizado";
  ponerTexto("#bookingCode", reserva.code);
  ponerTexto("#bookingOrigin", reserva.origin);
  ponerTexto("#bookingDestination", reserva.destination);
  ponerTexto("#bookingFlight", reserva.number);
  ponerTexto("#bookingDateTime", fechaLegible(reserva.departureDate) + ", " + reserva.departure);
  ponerTexto("#bookingPassenger", reserva.passenger);
  ponerTexto("#bookingSeat", reserva.seat);
  ponerTexto("#bookingGate", reserva.terminal + " · " + reserva.gate);
  ponerTexto("#bookingBaggage", reserva.baggage);
  ponerTexto("#bookingPrice", precio(reserva.total));
  ponerTexto("#bookingTrip", (reserva.leg || "Ida") + " · " + (reserva.cabin || "Flex"));
  ponerTexto("#bookingPaymentMethod", reserva.paymentMethod
    ? reserva.paymentMethod + (reserva.installments > 1 ? " · " + reserva.installments + " cuotas" : "")
    : "Sin seleccionar");
  ponerTexto("#reservationStatus", "Reserva: " + reserva.reservationStatus);
  ponerTexto("#paymentStatus", "Pago: " + reserva.paymentStatus);
  ponerTexto("#bookingCheckinStatus", "Check-in: " + estadoCheckin(reserva));
  ponerTexto("#reservationQrTitle", realizado ? "QR de embarque simulado" : "QR pendiente de check-in");
  ponerTexto("#bookingModeBadge", "Reserva guardada en este navegador");
  $("#reservationQr").hidden = !realizado;
  $("#reservationQr").classList.toggle("locked", !realizado);
  aplicarClaseEstado($("#reservationStatus"), reserva.reservationStatus === "Confirmada");
  aplicarClaseEstado($("#paymentStatus"), reserva.paymentStatus === "Aprobado");
  aplicarClaseEstado($("#bookingCheckinStatus"), realizado);
}

// Regla de negocio: habilitación del check-in.
function motivoBloqueoCheckin(reserva) {
  if (!reserva || reserva.reservationStatus !== "Confirmada") {
    return "Necesitás una reserva confirmada para realizar el check-in.";
  }
  if (reserva.paymentStatus !== "Aprobado") {
    return "El pago debe estar aprobado antes de realizar el check-in.";
  }
  // Regla de negocio: impedir un segundo check-in.
  if (estadoCheckin(reserva) === "Realizado") return "El check-in ya fue realizado.";
  return "";
}

function actualizarCheckin() {
  const reserva = obtenerReservaActual();
  const realizado = Boolean(reserva && reserva.reservationStatus === "Confirmada" &&
    reserva.paymentStatus === "Aprobado" && estadoCheckin(reserva) === "Realizado");
  ponerTexto("#checkinBookingCode", reserva ? reserva.code : "Sin reserva");
  ponerTexto("#checkinPassenger", reserva ? reserva.passenger : "—");
  ponerTexto("#checkinFlight", reserva ? reserva.number : "—");
  ponerTexto("#checkinSeat", reserva ? reserva.seat : "—");
  ponerTexto("#checkinGate", reserva ? reserva.gate : "—");
  ponerTexto("#boardingCode", reserva ? reserva.boardingCode : "—");
  ponerTexto("#boardingOrigin", reserva ? reserva.origin : "Origen");
  ponerTexto("#boardingDestination", reserva ? reserva.destination : "Destino");
  ponerTexto("#boardingDetails", realizado
    ? reserva.passenger + " · " + fechaLegible(reserva.departureDate) + " " + reserva.departure +
      " · Vuelo " + reserva.number + " · Asiento " + reserva.seat + " · Puerta " + reserva.gate +
      " · Código " + reserva.boardingCode : "");
  ponerTexto("#checkinStatus", "Check-in: " + estadoCheckin(reserva));
  ponerTexto("#checkinMessage", motivoBloqueoCheckin(reserva) || "Pago aprobado. Ya podés realizar el check-in.");
  ponerTexto("#boardingMessage", realizado
    ? "Tarjeta habilitada con QR simulado, sin validez para viajar."
    : "La tarjeta y el QR se habilitarán después del pago y del check-in.");
  aplicarClaseEstado($("#checkinStatus"), realizado);
  $("#boardingPass").classList.toggle("locked", !realizado);
  $("#boardingQr").hidden = !realizado;
  $("#performCheckin").disabled = realizado;
  ponerTexto("#performCheckin", realizado ? "Check-in realizado" : "Realizar Check-in");
}

function actualizarPagos() {
  const reserva = obtenerReservaActual();
  if (reserva && reserva.paymentStatus === "Aprobado") metodoPago = reserva.paymentMethod || "";
  ponerTexto("#paymentBookingSummary", reserva
    ? reserva.code + " · " + reserva.passenger + " · " + reserva.origin + " → " +
      reserva.destination + " · Total: " + precio(reserva.total)
    : "Necesitás una reserva confirmada para simular un pago.");
  ponerTexto("#paymentCurrentStatus", "Pago: " + (reserva ? reserva.paymentStatus : "Sin reserva"));
  aplicarClaseEstado($("#paymentCurrentStatus"), Boolean(reserva && reserva.paymentStatus === "Aprobado"));
  const pagado = Boolean(reserva && reserva.paymentStatus === "Aprobado");
  $$(".payment-method").forEach((boton) => {
    const seleccionado = boton.dataset.method === metodoPago;
    boton.setAttribute("aria-pressed", String(seleccionado));
    boton.closest(".payment-card").classList.toggle("selected", seleccionado);
    boton.textContent = (seleccionado ? "Seleccionado: " : "Seleccionar ") + boton.dataset.method;
    boton.disabled = pagado;
  });
  $("#cardOptions").hidden = metodoPago !== "Tarjeta";
  $("#paymentInstallments").disabled = pagado;
  if (pagado) $("#paymentInstallments").value = String(reserva.installments || 1);
  const ayudas = {
    Tarjeta: "Tarjeta de demostración: elegí la cantidad de cuotas.",
    Transferencia: "Transferencia de demostración: al confirmar se simula la recepción del importe. No transfieras dinero.",
    Efectivo: "Efectivo de demostración: al confirmar se simula un pago en ventanilla."
  };
  ponerTexto("#paymentMethodHelp", ayudas[metodoPago] || "Seleccioná un método de pago.");
  $("#confirmPayment").disabled = pagado;
  ponerTexto("#confirmPayment", pagado ? "Pago aprobado" : "Confirmar pago simulado");
}

function refrescarGestion() {
  actualizarReserva();
  actualizarCheckin();
  actualizarPagos();
}

function crearVuelos() {
  const origen = $("#originInput").value.trim().replace(/\s+/g, " ");
  const destino = $("#destinationInput").value.trim().replace(/\s+/g, " ");
  const fecha = $("#departureInput").value;
  const tipoViaje = $(".trip-tab.active").textContent.trim();
  return vuelosBase.map((vuelo) => {
    const resultado = {
      ...vuelo, origin: origen, destination: destino, departureDate: fecha,
      tripType: tipoViaje, returnDate: tipoViaje === "Ida y vuelta" ? $("#returnInput").value : "",
      passengers: Number($("#passengersInput").value)
    };
    resultado.availableSeats = asientosDisponibles(resultado);
    return resultado;
  });
}

function vuelosRegreso(vuelo) {
  if (!vuelo.returnDate) return [];
  return vuelosBase.map((base) => ({
    ...base, origin: vuelo.destination, destination: vuelo.origin,
    departureDate: vuelo.returnDate, leg: "Regreso"
  })).filter((regreso) => regreso.departureDate > vuelo.departureDate || regreso.departure > vuelo.arrival);
}

function tarjetaVuelo(vuelo) {
  const disponibles = asientosDisponibles(vuelo);
  return [
    '<article class="flight-card">',
      '<div class="flight-main">',
        '<div class="flight-facts">',
          '<span class="fact-chip">' + escaparHTML(vuelo.number) + "</span>",
          '<span class="status ' + (disponibles === 0 ? "error" : "") + '">' +
            (disponibles === 0 ? "Vuelo agotado" : escaparHTML(vuelo.status)) + "</span>",
          '<span class="fact-chip">' + escaparHTML(fechaLegible(vuelo.departureDate)) + "</span>",
          '<span class="fact-chip">' + disponibles + " asientos disponibles</span>",
        "</div>",
        '<p class="muted">Tarifa ' + escaparHTML(vuelo.cabin) + " · " + escaparHTML(vuelo.stops) + "</p>",
        '<div class="time-row">',
          '<span><small class="flight-label">Salida</small>' + escaparHTML(vuelo.departure) + "</span>",
          '<span class="flight-line" aria-hidden="true"></span>',
          '<span><small class="flight-label">Llegada</small>' + escaparHTML(vuelo.arrival) + "</span>",
        "</div>",
        "<p><strong>" + escaparHTML(vuelo.origin) + "</strong> → <strong>" +
          escaparHTML(vuelo.destination) + "</strong></p>",
        '<p class="muted">Duración: ' + escaparHTML(vuelo.duration) + " · Avión: " + escaparHTML(vuelo.aircraft) + "</p>",
        '<p class="muted">Equipaje: ' + escaparHTML(vuelo.baggage) + "</p>",
      "</div>",
      '<div class="flight-price">',
        '<span class="field-help">Por pasajero · tramo de ida</span>',
        '<div class="price">' + precio(vuelo.price) + "</div>",
        '<p class="muted">12 cuotas de ' + precio(vuelo.price / 12) + "</p>",
        '<p class="field-help">' + vuelo.passengers + " pasajero(s): " + precio(vuelo.price * vuelo.passengers) + "</p>",
      "</div>",
      '<button class="btn gold choose-flight" type="button" data-flight-id="' +
        escaparHTML(vuelo.id) + '">Ver detalle</button>',
    "</article>"
  ].join("");
}

function mostrarResultados(vuelos) {
  vuelosMostrados = vuelos;
  panelResultados.classList.add("show");
  introResultados.textContent = vuelos.length
    ? vuelos.length + " vuelos de ida para " + vuelos[0].origin + " → " + vuelos[0].destination +
      " · " + vuelos[0].passengers + " pasajero(s)." +
      (vuelos[0].returnDate ? " Elegí el vuelo de regreso en el detalle. Precio por tramo." : "")
    : "No encontramos vuelos para esta búsqueda.";
  listaResultados.innerHTML = vuelos.map(tarjetaVuelo).join("");
  panelResultados.scrollIntoView({ behavior: "smooth", block: "start" });
}

function mostrarDetalle(vuelo) {
  if (!vuelo) {
    mostrarAviso("Volvé a buscar y elegí un vuelo disponible.");
    return;
  }
  vueloElegido = vuelo;
  reservaPendienteTrasLogin = false;
  vueloElegido.availableSeats = asientosDisponibles(vuelo);
  const datos = [
    ["Número de vuelo", vuelo.number], ["Fecha", fechaLegible(vuelo.departureDate)],
    ["Hora de salida", vuelo.departure], ["Hora de llegada", vuelo.arrival],
    ["Duración", vuelo.duration], ["Avión", vuelo.aircraft],
    ["Asiento", "Asignación automática al reservar"], ["Equipaje", vuelo.baggage],
    ["Terminal", vuelo.terminal], ["Puerta estimada", vuelo.gate]
  ];
  detalleVuelo.innerHTML = '<div class="flight-facts"><span class="status">' +
    escaparHTML(vuelo.status) + '</span><span class="fact-chip">' + vueloElegido.availableSeats +
    ' asientos disponibles</span></div><h2 class="section-heading mt-14">' +
    escaparHTML(vuelo.origin) + " → " + escaparHTML(vuelo.destination) +
    '</h2><div class="route"><span>' + vuelo.departure +
    '</span><span aria-hidden="true">→</span><span>' + vuelo.arrival +
    '</span></div><div class="flight-meta">' +
    datos.map(([etiqueta, valor]) => '<div class="meta-item"><strong>' +
      etiqueta + "</strong><br>" + escaparHTML(valor) + "</div>").join("") + "</div>";

  if (vuelo.returnDate) {
    const regresos = vuelosRegreso(vuelo);
    detalleVuelo.innerHTML += '<div class="mt-24"><h3 class="small-title">Vuelo de regreso</h3><p>' +
      escaparHTML(vuelo.destination + " → " + vuelo.origin) + " · " + fechaLegible(vuelo.returnDate) +
      '</p><label>Elegí el regreso<span class="field"><select id="returnFlightSelect">' +
      '<option value="">Seleccioná un vuelo</option>' +
      regresos.map((regreso) => '<option value="' + regreso.id + '">' +
        escaparHTML(regreso.number + " · " + regreso.departure + "–" + regreso.arrival + " · " +
        regreso.cabin + " · " + precio(regreso.price) + " · " + asientosDisponibles(regreso) + " asientos") +
        "</option>").join("") + "</select></span></label>" +
      '<p class="field-help">Se reservan y pagan ambos tramos por separado. ' +
      (regresos.length ? "El regreso debe salir después de la llegada de la ida." :
        "No hay regresos posteriores a esta llegada. Elegí otro vuelo de ida o cambiá la fecha.") +
      '</p><p class="notice" id="returnFlightInfo"></p></div>';
  }
  detalleVuelo.innerHTML += '<div class="mt-24"><h3 class="small-title">Pasajeros</h3>' +
    '<p class="field-help">Ingresá el nombre y apellido de cada persona. Cada reserva descuenta un asiento.</p>' +
    '<div class="form-grid">' + Array.from({ length: vuelo.passengers }, (_, i) =>
      '<label>Pasajero ' + (i + 1) + '<span class="field"><input class="passenger-name" maxlength="100" ' +
        'placeholder="Nombre y apellido" value="' +
        escaparHTML(i === 0 && usuarioActual ? nombreCompleto(usuarioActual) : "") + '" required /></span></label>'
    ).join("") + "</div></div>";
  if ($("#returnFlightSelect")) $("#returnFlightSelect").addEventListener("change", actualizarResumen);
  actualizarResumen();
  mostrarPantalla("/detalle");
}

function obtenerRegresoElegido() {
  const selector = $("#returnFlightSelect");
  return selector ? vuelosRegreso(vueloElegido).find((vuelo) => vuelo.id === selector.value) : null;
}

function actualizarResumen() {
  if (!vueloElegido) return;
  const regreso = obtenerRegresoElegido();
  const total = (vueloElegido.price + (regreso ? regreso.price : 0)) * vueloElegido.passengers;
  ponerTexto("#returnFlightInfo", regreso
    ? regreso.number + " · " + regreso.duration + " · " + regreso.aircraft + " · Equipaje: " +
      regreso.baggage + " · Puerta: " + regreso.gate + " · " + regreso.status
    : "");
  resumenReserva.innerHTML = '<h2 class="section-heading">Resumen</h2><div class="summary-list">' +
    '<div><span>Tarifa de ida</span><strong>' + escaparHTML(vueloElegido.cabin) + "</strong></div>" +
    '<div><span>Pasajeros</span><strong>' + vueloElegido.passengers + "</strong></div>" +
    '<div><span>Ida por persona</span><strong>' + precio(vueloElegido.price) + "</strong></div>" +
    (vueloElegido.returnDate ? '<div><span>Regreso por persona</span><strong>' +
      (regreso ? precio(regreso.price) : "Seleccionar") + "</strong></div>" : "") +
    '<div><span>Millas demostrativas por persona</span><strong>' +
      (vueloElegido.miles + (regreso ? regreso.miles : 0)) + "</strong></div>" +
    '<div><span>' + (vueloElegido.returnDate && !regreso ? "Subtotal de ida" : "Total del viaje") +
      "</span><strong>" + precio(total) + "</strong></div>" +
    '<div><span>12 cuotas sin interés</span><strong>' + precio(total / 12) + "</strong></div></div>" +
    '<p class="form-message" id="bookingMessage" role="status"></p>' +
    '<button class="btn gold full" id="confirmBooking" type="button">' +
      (asientosDisponibles(vueloElegido) === 0 ? "Vuelo agotado" : "Confirmar reserva") + "</button>" +
    '<p class="field-help">El pago queda pendiente. Podés aprobar la simulación desde Pagos para cada reserva.</p>';
}

function abrirAcceso(tipo = "login") {
  focoAntesDelAcceso = document.activeElement;
  modalAcceso.classList.add("open");
  document.body.style.overflow = "hidden";
  cambiarFormulario(tipo);
  $(tipo === "login" ? "#loginEmail" : "#registerFirstName").focus();
}

function cerrarAcceso() {
  modalAcceso.classList.remove("open");
  document.body.style.overflow = "";
  reservaPendienteTrasLogin = false;
  $$("#authModal .form-message").forEach((mensaje) => {
    mensaje.textContent = "";
    mensaje.classList.remove("success");
  });
  $("#loginPassword").value = "";
  $("#registerPassword").value = "";
  if (focoAntesDelAcceso && focoAntesDelAcceso.isConnected) focoAntesDelAcceso.focus();
}

function cambiarFormulario(tipo) {
  $$(".auth-tab").forEach((pestana) => {
    const activa = pestana.dataset.authTab === tipo;
    pestana.classList.toggle("active", activa);
    pestana.setAttribute("aria-pressed", String(activa));
  });
  $("#loginForm").classList.toggle("active", tipo === "login");
  $("#registerForm").classList.toggle("active", tipo === "register");
}

function completarAcceso(usuario, mensaje) {
  const continuarReserva = reservaPendienteTrasLogin && vueloElegido;
  usuarioActual = usuario;
  codigoReservaActual = "";
  metodoPago = "";
  cerrarAcceso();
  actualizarSesion();
  if (continuarReserva) {
    const primerPasajero = $(".passenger-name");
    if (primerPasajero && !primerPasajero.value.trim()) primerPasajero.value = nombreCompleto(usuario);
    ponerTexto("#bookingMessage", "Sesión iniciada. Revisá los pasajeros y confirmá la reserva.");
    $("#confirmBooking").focus();
  }
  mostrarAviso(mensaje);
}

function iniciarSesion(evento) {
  evento.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  const mensaje = $("#loginMessage");
  mensaje.classList.remove("success");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
    mensaje.textContent = "Ingresá un email válido y una contraseña de al menos 6 caracteres.";
    return;
  }

  const cuenta = cuentas.find((item) => item.email === email && item.password === password);
  if (!cuenta) {
    mensaje.textContent = "No encontramos esa cuenta. Revisá los datos o registrate.";
    return;
  }

  completarAcceso(cuenta, "Sesión iniciada correctamente.", mensaje);
}

function registrarUsuario(evento) {
  evento.preventDefault();
  const cuenta = {
    ...leerDatosPerfil("register"),
    // Contraseña de demostración local: usar datos ficticios en este proyecto.
    password: $("#registerPassword").value,
    createdAt: new Date().toISOString()
  };
  const mensaje = $("#registerMessage");
  mensaje.classList.remove("success");
  const error = validarPerfil(cuenta);
  if (error || cuenta.password.length < 6) {
    mensaje.textContent = error || "La contraseña debe tener al menos 6 caracteres.";
    return;
  }
  const nuevas = cuentas.concat(cuenta);
  if (!guardarJSON(CLAVES.cuentas, nuevas)) {
    mensaje.textContent = "No pudimos guardar la cuenta. Permití que el navegador guarde datos e intentá de nuevo.";
    return;
  }
  cuentas = nuevas;
  $("#registerForm").reset();
  completarAcceso(cuenta, "Cuenta creada. Tus datos ya aparecen en Mi Perfil.");
}

// Regla de negocio: sesión iniciada antes de confirmar una reserva.
function confirmarReserva() {
  if (!vueloElegido) return mostrarAviso("Primero elegí un vuelo desde la búsqueda.");
  if (!usuarioActual) {
    reservaPendienteTrasLogin = true;
    abrirAcceso("login");
    ponerTexto("#loginMessage", "Iniciá sesión para confirmar la reserva.");
    return;
  }
  const error = (texto) => ponerTexto("#bookingMessage", texto);
  const regreso = obtenerRegresoElegido();
  if (vueloElegido.returnDate && !regreso) return error("Seleccioná un vuelo de regreso.");
  if (!fechaValida(vueloElegido.departureDate) || vueloElegido.departureDate < fechaHoy()) {
    return error("La fecha de salida ya no es válida. Volvé a buscar.");
  }
  const pasajeros = $$(".passenger-name");
  const nombres = Array.from(pasajeros, (campo) => campo.value.trim().replace(/\s+/g, " "));
  if (nombres.length !== vueloElegido.passengers || nombres.some((nombre) =>
      nombre.length < 5 || nombre.length > 100 || nombre.split(" ").length < 2 || !/\p{L}/u.test(nombre) || !/^[\p{L} .'-]+$/u.test(nombre))) {
    return error("Ingresá nombre y apellido válidos para cada pasajero.");
  }

  // Regla de negocio: disponibilidad del vuelo.
  // Un pasajero = una reserva = un asiento. Revisamos ambos tramos antes de guardar.
  const tramos = regreso ? [vueloElegido, regreso] : [vueloElegido];
  for (const vuelo of tramos) {
    const disponibles = asientosDisponibles(vuelo);
    if (disponibles === 0) return error("Vuelo agotado. No hay asientos disponibles para este vuelo.");
    if (disponibles < nombres.length) {
      return error("No hay asientos suficientes para todos los pasajeros en el vuelo " + vuelo.number + ".");
    }
  }

  const nuevas = [];
  tramos.forEach((vuelo, tramo) => {
    nombres.forEach((nombre) => {
      const code = generarCodigo(nuevas);
      const seat = asignarAsiento(vuelo, nuevas);
      nuevas.push({
        code, flightKey: claveVuelo(vuelo), number: vuelo.number,
        origin: vuelo.origin, destination: vuelo.destination, departureDate: vuelo.departureDate,
        departure: vuelo.departure, arrival: vuelo.arrival, passenger: nombre, seat,
        passengerIsOwner: nombre === nombreCompleto(usuarioActual),
        terminal: vuelo.terminal, gate: vuelo.gate, baggage: vuelo.baggage, cabin: vuelo.cabin,
        total: vuelo.price, leg: tramo === 0 ? "Ida" : "Regreso",
        tripType: vueloElegido.tripType, reservationStatus: "Confirmada",
        paymentStatus: "Pendiente", paymentMethod: "", checkinStatus: "Pendiente",
        boardingCode: vuelo.number.replace(/\s/g, "") + "-" + code + "-" + seat,
        ownerEmail: usuarioActual.email, demo: false
      });
    });
  });
  // Al agregar cada reserva confirmada, asientosDisponibles descuenta 1.
  // Se guarda el conjunto completo para no dejar una ida sin su regreso.
  if (!guardarReservas(reservas.concat(nuevas))) {
    return error("No pudimos guardar la reserva. Revisá que el navegador permita guardar datos e intentá de nuevo.");
  }
  codigoReservaActual = nuevas[0].code;
  metodoPago = "";
  reservaPendienteTrasLogin = false;
  vueloElegido = null; // Evita una segunda confirmación del mismo formulario.
  resumenReserva.innerHTML = '<h2 class="section-heading">Reserva confirmada</h2>' +
    '<p>Consultá tus reservas para continuar con el pago.</p>' +
    '<a class="btn gold nav-go" href="#/reservas" data-route="/reservas">Ver Mis Reservas</a>';
  detalleVuelo.innerHTML = '<p class="muted">Buscá otro vuelo para realizar una nueva reserva.</p>';
  listaResultados.innerHTML = vuelosMostrados.map(tarjetaVuelo).join("");
  ponerTexto("#paymentMessage", "");
  mostrarPantalla("/reservas");
  mostrarAviso(nuevas.length === 1
    ? "Reserva " + nuevas[0].code + " confirmada. El pago está pendiente."
    : nuevas.length + " reservas confirmadas. Cada pasajero tiene una reserva por tramo; los pagos están pendientes.");
}

function generarCodigo(nuevas) {
  let codigo;
  do {
    codigo = "AM" + Math.random().toString(36).slice(2, 8).padEnd(6, "0").toUpperCase();
  } while (reservas.concat(nuevas).some((reserva) => reserva.code === codigo));
  return codigo;
}

function guardarReservas(nuevas) {
  if (!guardarJSON(CLAVES.reservas, nuevas)) return false;
  reservas = nuevas;
  return true;
}

// Regla de negocio: validación del pago.
// SI hay reserva confirmada Y método válido, ENTONCES aprobar la simulación.
function confirmarPago(evento) {
  evento.preventDefault();
  const reserva = obtenerReservaActual();
  const mensaje = $("#paymentMessage");
  mensaje.classList.remove("success");
  if (!reserva || reserva.reservationStatus !== "Confirmada") {
    mensaje.textContent = "Necesitás una reserva confirmada para realizar el pago.";
    return;
  }
  if (reserva.paymentStatus === "Aprobado") {
    mensaje.textContent = "El pago de esta reserva ya está aprobado.";
    return;
  }
  if (!["Tarjeta", "Transferencia", "Efectivo"].includes(metodoPago)) {
    mensaje.textContent = "Seleccioná un método de pago.";
    return;
  }
  const cuotas = metodoPago === "Tarjeta" ? Number($("#paymentInstallments").value) : 1;
  if (![1, 3, 6, 12].includes(cuotas)) {
    mensaje.textContent = "Pago rechazado: seleccioná una cantidad de cuotas válida.";
    return;
  }
  const actualizada = { ...reserva, paymentStatus: "Aprobado", paymentMethod: metodoPago, installments: cuotas };
  if (!guardarReservas(reservas.map((item) => item.code === reserva.code ? actualizada : item))) {
    mensaje.textContent = "No pudimos guardar el pago. Intentá de nuevo.";
    return;
  }
  refrescarGestion();
  mensaje.classList.add("success");
  mensaje.textContent = "El pago fue aprobado. Ya podés realizar el check-in de esta reserva.";
  mostrarAviso("El pago fue aprobado.");
}

function realizarCheckin() {
  const reserva = obtenerReservaActual();
  const bloqueo = motivoBloqueoCheckin(reserva);
  if (bloqueo) {
    ponerTexto("#checkinMessage", bloqueo);
    mostrarAviso(bloqueo);
    return;
  }
  const actualizada = { ...reserva, checkinStatus: "Realizado" };
  if (!guardarReservas(reservas.map((item) => item.code === reserva.code ? actualizada : item))) {
    mostrarAviso("No pudimos guardar el check-in. Intentá de nuevo.");
    return;
  }
  refrescarGestion();
  mostrarAviso("Check-in realizado. La tarjeta de embarque y el QR ya están habilitados.");
}

function fechaHoy() {
  const hoy = new Date();
  return hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") +
    "-" + String(hoy.getDate()).padStart(2, "0");
}

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(fecha + "T12:00:00");
  return !Number.isNaN(valor.getTime()) && valor.getFullYear() === Number(fecha.slice(0, 4)) &&
    valor.getMonth() + 1 === Number(fecha.slice(5, 7)) && valor.getDate() === Number(fecha.slice(8, 10));
}

function normalizarCiudad(ciudad) {
  return String(ciudad || "").trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

// Regla de negocio: validar búsqueda.
function validarBusqueda() {
  const origen = $("#originInput").value.trim();
  const destino = $("#destinationInput").value.trim();
  const salida = $("#departureInput").value;
  const regreso = $("#returnInput").value;
  const tipo = $(".trip-tab.active").textContent.trim();
  const pasajeros = Number($("#passengersInput").value);
  if (origen.length < 2 || destino.length < 2 || origen.length > 60 || destino.length > 60 ||
      !/\p{L}/u.test(origen) || !/\p{L}/u.test(destino) ||
      !/^[\p{L} .'-]+$/u.test(origen) || !/^[\p{L} .'-]+$/u.test(destino)) {
    return "Ingresá un origen y un destino válidos.";
  }
  if (normalizarCiudad(origen) === normalizarCiudad(destino)) {
    return "El origen y el destino no pueden ser iguales.";
  }
  if (!fechaValida(salida) || salida < fechaHoy()) return "Ingresá una fecha de salida válida, desde hoy.";
  if (tipo === "Ida y vuelta") {
    if (!fechaValida(regreso)) return "Ingresá una fecha de regreso válida.";
    if (regreso < salida) return "La fecha de regreso no puede ser anterior a la fecha de salida.";
  }
  if (!Number.isInteger(pasajeros) || pasajeros < 1 || pasajeros > 6) return "Elegí entre 1 y 6 pasajeros.";
  return "";
}

function actualizarTipoViaje() {
  const tipo = $(".trip-tab.active").textContent.trim();
  const regreso = $("#returnInput");
  const necesitaRegreso = tipo === "Ida y vuelta";
  regreso.disabled = !necesitaRegreso;
  regreso.required = necesitaRegreso;
  regreso.setAttribute("aria-disabled", String(!necesitaRegreso));
  $("#departureInput").min = fechaHoy();
  regreso.min = $("#departureInput").value || fechaHoy();
  ponerTexto("#tripHelp", tipo === "Multidestinos"
    ? "Armá tu viaje por tramos: buscá y reservá una ruta por vez. Tus reservas se guardan juntas en Mis Reservas."
    : necesitaRegreso ? "Elegí las fechas. Podés seleccionar el vuelo de regreso en el detalle."
      : "Elegí la ruta y la cantidad de pasajeros.");
}

function leerDatosPerfil(prefijo) {
  return {
    firstName: $("#" + prefijo + "FirstName").value.trim().replace(/\s+/g, " "),
    lastName: $("#" + prefijo + "LastName").value.trim().replace(/\s+/g, " "),
    dni: $("#" + prefijo + "Dni").value.trim(),
    birthDate: $("#" + prefijo + "BirthDate").value,
    email: $("#" + prefijo + "Email").value.trim().toLowerCase(),
    phone: $("#" + prefijo + "Phone").value.trim(),
    address: $("#" + prefijo + "Address").value.trim(),
    nationality: $("#" + prefijo + "Nationality").value.trim()
  };
}

function validarPerfil(cuenta, emailAnterior = "") {
  const nombreValido = (valor) => valor.length >= 2 && valor.length <= 50 && /\p{L}/u.test(valor) && /^[\p{L} .'-]+$/u.test(valor);
  if (!nombreValido(cuenta.firstName) || !nombreValido(cuenta.lastName)) return "Ingresá un nombre y un apellido válidos.";
  if (!/^[\d. ]+$/.test(cuenta.dni) || !/^\d{7,8}$/.test(cuenta.dni.replace(/[. ]/g, ""))) {
    return "Ingresá un DNI de 7 u 8 dígitos.";
  }
  if (!fechaValida(cuenta.birthDate) || cuenta.birthDate >= fechaHoy() || cuenta.birthDate < "1900-01-01") {
    return "Ingresá una fecha de nacimiento válida, anterior a hoy.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cuenta.email) || cuenta.email.length > 100) return "Ingresá un email válido.";
  if (!/^[+\d ()-]+$/.test(cuenta.phone) || !/^\d{6,15}$/.test(cuenta.phone.replace(/\D/g, ""))) {
    return "Ingresá un teléfono válido, de 6 a 15 dígitos.";
  }
  if (cuenta.address.length < 4 || cuenta.address.length > 120) return "Ingresá una dirección de 4 a 120 caracteres.";
  if (!nombreValido(cuenta.nationality)) return "Ingresá una nacionalidad válida.";
  if (cuentas.some((item) => item.email === cuenta.email && item.email !== emailAnterior)) {
    return "Ya existe una cuenta registrada con ese email.";
  }
  return "";
}

function abrirEditorPerfil() {
  if (!usuarioActual) {
    abrirAcceso("login");
    ponerTexto("#loginMessage", "Iniciá sesión o registrate para editar tu perfil.");
    return;
  }
  Object.keys(leerDatosPerfil("edit")).forEach((campo) => {
    $("#edit" + campo.charAt(0).toUpperCase() + campo.slice(1)).value = usuarioActual[campo] || "";
  });
  $("#profileForm").hidden = false;
  $("#editProfile").setAttribute("aria-expanded", "true");
  ponerTexto("#profileMessage", "");
  $("#editFirstName").focus();
}

function cerrarEditorPerfil() {
  $("#profileForm").hidden = true;
  $("#editProfile").setAttribute("aria-expanded", "false");
}

function guardarPerfil(evento) {
  evento.preventDefault();
  if (!usuarioActual) return mostrarAviso("Iniciá sesión para editar tu perfil.");
  const datos = leerDatosPerfil("edit");
  const error = validarPerfil(datos, usuarioActual.email);
  if (error) return ponerTexto("#profileMessage", error);
  const anterior = usuarioActual;
  const editada = { ...anterior, ...datos };
  const nuevasCuentas = cuentas.map((cuenta) => cuenta.email === anterior.email ? editada : cuenta);
  const anterioresReservas = reservas;
  const nuevasReservas = reservas.map((reserva) => reserva.ownerEmail === anterior.email
    ? { ...reserva, ownerEmail: editada.email,
      passenger: reserva.passengerIsOwner || reserva.passenger === nombreCompleto(anterior)
        ? nombreCompleto(editada) : reserva.passenger } : reserva);
  // Conservamos el vínculo de las reservas cuando cambia el email.
  if (!guardarReservas(nuevasReservas)) return ponerTexto("#profileMessage", "No pudimos guardar los cambios. Intentá de nuevo.");
  if (!guardarJSON(CLAVES.cuentas, nuevasCuentas)) {
    guardarReservas(anterioresReservas);
    return ponerTexto("#profileMessage", "No pudimos guardar los cambios. Intentá de nuevo.");
  }
  cuentas = nuevasCuentas;
  usuarioActual = editada;
  $$(".passenger-name").forEach((campo) => {
    if (campo.value.trim() === nombreCompleto(anterior)) campo.value = nombreCompleto(editada);
  });
  actualizarSesion();
  cerrarEditorPerfil();
  $("#editProfile").focus();
  mostrarAviso("Perfil actualizado.");
}

document.addEventListener("click", (evento) => {
  const irA = evento.target.closest(".nav-go");
  const abrirModal = evento.target.closest(".auth-open");
  const elegirVuelo = evento.target.closest(".choose-flight");
  const accionDemostrativa = evento.target.closest(".demo-action");
  const metodo = evento.target.closest(".payment-method");

  if (irA) {
    evento.preventDefault();
    mostrarPantalla(irA.dataset.route);
  }
  if (abrirModal) abrirAcceso(abrirModal.dataset.authMode);
  if (elegirVuelo) mostrarDetalle(vuelosMostrados.find((item) => item.id === elegirVuelo.dataset.flightId));
  if (evento.target.closest("#confirmBooking")) confirmarReserva();
  if (evento.target.closest("#performCheckin")) realizarCheckin();
  if (evento.target.closest("#editProfile")) abrirEditorPerfil();
  if (evento.target.closest("#cancelEditProfile")) {
    cerrarEditorPerfil();
    $("#editProfile").focus();
  }
  if (metodo && !metodo.disabled) {
    metodoPago = metodo.dataset.method;
    ponerTexto("#paymentMessage", "");
    actualizarPagos();
  }
  if (accionDemostrativa) mostrarAviso((accionDemostrativa.dataset.actionName || "Esta acción") +
    " es una acción demostrativa del proyecto.");
  if (evento.target.closest('a[href="#millas"]')) {
    evento.preventDefault();
    $("#millas").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (menu.classList.contains("open") && !evento.target.closest(".topbar")) cerrarMenu();
});

botonMenu.setAttribute("aria-controls", "mainNavigation");
botonMenu.addEventListener("click", () => {
  const abierto = menu.classList.toggle("open");
  botonMenu.setAttribute("aria-expanded", String(abierto));
  botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
});

$$(".trip-tab").forEach((boton) => {
  boton.addEventListener("click", () => {
    $$(".trip-tab").forEach((item) => {
      item.classList.toggle("active", item === boton);
      item.setAttribute("aria-pressed", String(item === boton));
    });
    invalidarResultados();
    actualizarTipoViaje();
  });
});

function invalidarResultados() {
  vuelosMostrados = [];
  vueloElegido = null;
  reservaPendienteTrasLogin = false;
  panelResultados.classList.remove("show");
  listaResultados.innerHTML = "";
  ponerTexto("#searchMessage", "");
  detalleVuelo.innerHTML = '<p class="muted">Buscá y elegí un vuelo para ver el detalle.</p>';
  resumenReserva.innerHTML = '<h2 class="section-heading">Resumen</h2><p>El precio aparecerá al elegir un vuelo.</p>';
}

$(".search-panel").addEventListener("input", invalidarResultados);
$("#departureInput").addEventListener("change", actualizarTipoViaje);
$(".search-panel").addEventListener("submit", (evento) => {
  evento.preventDefault();
  invalidarResultados();
  const error = validarBusqueda();
  if (error) {
    ponerTexto("#searchMessage", error);
    return;
  }
  mostrarResultados(crearVuelos());
});

$$(".auth-tab").forEach((pestana) => {
  pestana.addEventListener("click", () => cambiarFormulario(pestana.dataset.authTab));
});
$("#closeAuth").addEventListener("click", cerrarAcceso);
$("#loginForm").addEventListener("submit", iniciarSesion);
$("#registerForm").addEventListener("submit", registrarUsuario);
$("#profileForm").addEventListener("submit", guardarPerfil);
$("#paymentForm").addEventListener("submit", confirmarPago);
$("#editProfile").setAttribute("aria-controls", "profileForm");
$("#editProfile").setAttribute("aria-expanded", "false");
["bookingSelect", "paymentSelect", "checkinSelect"].forEach((id) => {
  $("#" + id).addEventListener("change", (evento) => {
    codigoReservaActual = evento.target.value;
    metodoPago = "";
    ponerTexto("#paymentMessage", "");
    refrescarGestion();
  });
});

modalAcceso.addEventListener("click", (evento) => {
  if (evento.target === modalAcceso) cerrarAcceso();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    if (modalAcceso.classList.contains("open")) cerrarAcceso();
    if (menu.classList.contains("open")) {
      cerrarMenu();
      botonMenu.focus();
    }
  }
  if (evento.key === "Tab" && modalAcceso.classList.contains("open")) {
    const controles = Array.from(modalAcceso.querySelectorAll("button, input"))
      .filter((elemento) => elemento.getClientRects().length && !elemento.disabled);
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }
});

$(".logout").addEventListener("click", () => {
  usuarioActual = null;
  codigoReservaActual = "";
  metodoPago = "";
  reservaPendienteTrasLogin = false;
  cerrarEditorPerfil();
  invalidarResultados();
  ponerTexto("#paymentMessage", "");
  actualizarSesion();
  mostrarPantalla("/");
  mostrarAviso("Sesión cerrada. Tus datos quedan guardados en este navegador.");
});

// El hash permite recargar cualquier sección sin necesitar un servidor especial.
window.addEventListener("popstate", () => mostrarPantalla(obtenerRutaActual(), true));
window.addEventListener("hashchange", () => mostrarPantalla(obtenerRutaActual(), true));
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1200) cerrarMenu();
});

$("#registerBirthDate").max = fechaHoy();
$("#editBirthDate").max = fechaHoy();
if ($("#departureInput").value < fechaHoy()) $("#departureInput").value = fechaHoy();
$$(".nav-go").forEach((enlace) => {
  if (enlace.tagName === "A") enlace.setAttribute("href", "#" + enlace.dataset.route);
});
actualizarTipoViaje();
actualizarSesion();
mostrarPantalla(obtenerRutaActual(), true);
