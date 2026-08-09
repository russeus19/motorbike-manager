/**
 * The negotiation screen's dialogue bank — what the rider actually
 * says as a reaction to an offer, organized by their visible
 * personality (Ambicioso/Profesional/Tranquilo/Temperamental/
 * Trabajador — the exact same tag shown on their profile, see
 * riderPersonality in utils/marketAI.js) and which zone of the
 * thermometer the offer landed in (frio/dudoso/favorable).
 *
 * 5 personalities × 3 zones × 5 lines each = 75 lines total. Picked
 * with rotation (see pickNegotiationLine in utils/negotiationDialogue.js)
 * so the same line never repeats back-to-back within one conversation.
 */
export const NEGOTIATION_DIALOGUE = {
  Ambicioso: {
    frio: [
      "Con esto no llego ni para empezar a hablar. Busco un proyecto de verdad.",
      "¿Esto es en serio? Yo aspiro a mucho más.",
      "No he llegado hasta aquí para aceptar migajas.",
      "Si esto es lo mejor que tienes, ya sabes mi respuesta.",
      "Necesito sentir que voy a un sitio donde pueda ganar. Esto no me lo transmite.",
    ],
    dudoso: [
      "Me lo pensaré. Pero si quieres convencerme de verdad, sube la apuesta.",
      "No está mal, pero tampoco es lo que busco. Dame unos días.",
      "Hay algo aquí que me llama la atención, pero necesito verlo con calma.",
      "Podría ser el inicio de algo grande, o podría no ser nada. Lo miraré.",
      "Se acerca, pero todavía no me has convencido del todo.",
    ],
    favorable: [
      "¡Esto sí que es un proyecto a mi altura! Cuenta conmigo.",
      "Por fin alguien que entiende lo que valgo. Firmamos.",
      "Esto es justo lo que estaba esperando. Vamos a ganar juntos.",
      "Con esta oferta sobre la mesa, no hay nada que pensar.",
      "Me has convencido. Es hora de demostrar de qué soy capaz.",
    ],
  },
  Profesional: {
    frio: [
      "Los números no cuadran. No es una propuesta seria.",
      "Esta oferta está por debajo de mi valor de mercado.",
      "He revisado las condiciones y no me compensan.",
      "Entiendo la intención, pero el planteamiento económico no funciona.",
      "No es nada personal. Esto no es lo que necesito ahora mismo.",
    ],
    dudoso: [
      "Hay puntos interesantes, pero necesito estudiarlo con calma.",
      "Me gustaría revisar los detalles antes de decidir nada.",
      "No es un no, pero tampoco un sí. Déjame analizarlo.",
      "La propuesta tiene sentido en parte. Necesito tiempo.",
      "Voy a valorarlo con cabeza fría antes de responder.",
    ],
    favorable: [
      "Los términos son sólidos. Acepto.",
      "Esta propuesta tiene sentido en todos los aspectos. Adelante.",
      "He hecho mis cuentas, y esto funciona. Firmamos.",
      "Condiciones claras, oferta justa. No hay más que hablar.",
      "Esto es exactamente el tipo de acuerdo que buscaba.",
    ],
  },
  Tranquilo: {
    frio: [
      "Mm, no sé... no me acaba de convencer.",
      "No pasa nada, pero esto no es lo que buscaba.",
      "Prefiero esperar a algo que encaje mejor conmigo.",
      "No hay prisa por mi parte, y esto tampoco me la da a mí.",
      "Gracias por pensar en mí, pero no es lo que necesito.",
    ],
    dudoso: [
      "Déjame que le dé una vuelta con calma.",
      "No está mal. Lo pensaré sin agobios.",
      "Podría funcionar. Ya te digo algo más adelante.",
      "No tengo prisa por decidir, pero tampoco lo descarto.",
      "Vamos a ver cómo se siente esto dentro de unos días.",
    ],
    favorable: [
      "Sin estrés, esto me gusta. Adelante.",
      "Me quedo tranquilo con estas condiciones. Cuenta conmigo.",
      "Esto encaja bien conmigo, sin necesidad de darle más vueltas.",
      "No hacía falta convencerme mucho, pero lo has conseguido igual. Vamos.",
      "Con esta calma que transmite la oferta, digo que sí.",
    ],
  },
  Temperamental: {
    frio: [
      "¿En serio me traes esto? Ni de broma.",
      "Esto es una falta de respeto. Ni lo voy a considerar.",
      "No pienso perder el tiempo con una oferta así.",
      "¡Venga ya! Espero algo mejor la próxima vez.",
      "Con esto solo consigues que me enfade. Olvídalo.",
    ],
    dudoso: [
      "No sé qué pensar, la verdad. Dame un par de días.",
      "Me has pillado a medias. No sé si me convence.",
      "Tiene algo, pero no me acaba de cerrar del todo.",
      "Voy a dormirlo antes de decir nada más.",
      "Ahora mismo no sé qué decirte. Lo miro con calma.",
    ],
    favorable: [
      "¡Esto sí que me gusta! ¡Hecho!",
      "Ahora hablamos el mismo idioma. ¡Vamos!",
      "¡Por fin una oferta como Dios manda! Acepto.",
      "Esto sí que me hace ilusión. ¡Firmamos ya!",
      "No hace falta que me convenzas más. ¡Estoy dentro!",
    ],
  },
  Trabajador: {
    frio: [
      "No veo que esta oferta valore el esfuerzo que pongo cada fin de semana.",
      "Con esto no me siento respaldado para seguir dándolo todo.",
      "Necesito algo que reconozca el trabajo, y esto no lo hace.",
      "No es lo que esperaba tras tantos años currándomelo.",
      "Esto no está a la altura de lo que vengo demostrando.",
    ],
    dudoso: [
      "Voy a pensarlo con calma, sin prisas.",
      "Hay cosas que me gustan, otras que no tanto. Lo valoraré.",
      "Necesito ver si esto encaja con lo que quiero construir.",
      "Dame tiempo para meditarlo bien.",
      "No es un no, pero necesito reflexionarlo con cabeza.",
    ],
    favorable: [
      "Esto sí que reconoce el trabajo. Acepto encantado.",
      "Por fin una oferta que está a la altura del esfuerzo. Vamos allá.",
      "Se nota que valoráis lo que aporto. Cuenta conmigo.",
      "Esto es justo la recompensa que esperaba. Firmamos.",
      "Con esto sí que me siento respaldado. Adelante.",
    ],
  },
};

/** The selling team's own reactions to a release-fee offer — simpler
 * than the rider's bank (no personality split, just the three zones),
 * since this is a team weighing a business decision, not a person
 * weighing a career move. */
export const TEAM_NEGOTIATION_DIALOGUE = {
  frio: [
    "Esa cantidad ni se acerca a lo que vale para nosotros.",
    "No vamos a dejarlo marchar por eso. Ni de lejos.",
    "Esta oferta no es seria. La rechazamos.",
    "Contamos con él para el proyecto — no está en venta por ese precio.",
    "Con esa cifra sobre la mesa, no hay nada que negociar.",
  ],
  dudoso: [
    "Es una cifra interesante. Nos lo pensaremos.",
    "Tenemos que valorarlo con calma antes de responder.",
    "No es un no, pero necesitamos estudiarlo bien.",
    "Lo trataremos internamente y os contestamos en el próximo Gran Premio.",
    "Hay margen para hablar, pero no podemos decidir todavía.",
  ],
  favorable: [
    "Es una oferta que no podemos rechazar. Adelante.",
    "Con esa compensación, aceptamos dejarlo salir.",
    "Es un buen acuerdo para las dos partes. Trato hecho.",
    "Esa cifra compensa de sobra su marcha. Aceptado.",
    "No hay motivo para negarnos con esa oferta sobre la mesa.",
  ],
};
