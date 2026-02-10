import { NarratorStyle } from '../types';

type PhraseType = 'WIN' | 'SCORE';

// State to track used phrases to avoid repetition until all are exhausted
const usedIndices: Record<string, number[]> = {};

const getShuffleKey = (style: NarratorStyle, type: PhraseType) => `${style}_${type}`;

export const getLocalCommentary = (style: NarratorStyle, type: PhraseType, name: string, score: number): string => {
  // Safety check: If the style passed doesn't exist in our dictionary (e.g. old local storage), fallback to DOCUMENTARY
  const safeStyle = NARRATOR_PHRASES[style] ? style : 'DOCUMENTARY';
  
  const phrases = NARRATOR_PHRASES[safeStyle][type];
  const key = getShuffleKey(safeStyle, type);

  // Initialize tracking array if not exists
  if (!usedIndices[key]) {
    usedIndices[key] = [];
  }

  // If we have used all phrases, reset the tracking (reshuffle deck)
  if (usedIndices[key].length >= phrases.length) {
    usedIndices[key] = [];
  }

  // Find a random index that hasn't been used yet
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * phrases.length);
  } while (usedIndices[key].includes(randomIndex));

  // Mark as used
  usedIndices[key].push(randomIndex);

  const template = phrases[randomIndex];
  return template.replace(/{{name}}/g, name).replace(/{{score}}/g, score.toString());
};

const NARRATOR_PHRASES: Record<NarratorStyle, Record<PhraseType, string[]>> = {
  DOCUMENTARY: {
    WIN: [
      "Aquí, en la inmensidad inexplorada del ecosistema digital, somos testigos privilegiados de una adaptación neurobiológica sin precedentes. El espécimen conocido como {{name}} ha demostrado una superioridad cognitiva abrumadora, superando a la manada con herramientas primitivas pero efectivas. Los antropólogos del futuro citarán este momento como el instante exacto en que {{name}} ascendió a la cima de la cadena alimenticia artística.",
      "Extraordinario. Simplemente extraordinario. Lo que comenzó como una disputa territorial por puntos ha culminado en una exhibición de dominio absoluto. {{name}}, mediante un despliegue fascinante de coordinación mano-ojo y pensamiento abstracto, ha subyugado a sus rivales. La naturaleza es dura, implacable, pero hoy se inclina reverente ante el nuevo macho o hembra alfa de la manada: {{name}}.",
      "Observen el comportamiento de celebración. Es un ritual complejo, lleno de dopamina y satisfacción evolutiva. {{name}} ha completado la migración a través del tablero de juego, evitando a los depredadores y asegurando los recursos necesarios para la victoria. En mis años documentando la vida salvaje del Pictionary, rara vez he visto un ejemplar con tal capacidad de supervivencia y estilo. Una victoria para los libros de historia natural.",
      "El silencio cae sobre la sabana del juego. Los competidores se retiran a sus madrigueras, derrotados, mientras {{name}} ruge triunfante bajo el sol del éxito. La selección natural ha sido clara hoy: la genética artística de {{name}} es superior. No es solo suerte, es una adaptación perfecta al entorno, una simbiosis entre el lápiz y el intelecto que ha resultado en una victoria aplastante e indiscutible.",
      "Contemplen la majestuosidad del triunfo. Como un águila real que desciende en picado sobre su presa, {{name}} ha capturado la victoria con una precisión letal. El resto de la manada solo puede mirar con asombro y envidia mientras {{name}} disfruta del festín de la gloria. Este evento quedará marcado en los estratos geológicos de nuestra memoria colectiva como la Era de {{name}}.",
      "Nos encontramos ante un fenómeno raramente observado en cautiverio. {{name}} ha utilizado su córtex prefrontal para resolver problemas complejos de comunicación visual a una velocidad que desafía la biología. Los rivales, confundidos y superados, se dispersan. La jerarquía ha sido restablecida y {{name}} se sienta cómodamente en el trono de la evolución lúdica.",
      "Fascinante. La capacidad de {{name}} para transformar conceptos abstractos en representaciones gráficas ha demostrado ser una ventaja evolutiva decisiva. Mientras otros luchaban por sobrevivir en este entorno hostil de trazos y borrones, {{name}} prosperaba, acumulando recursos en forma de puntos hasta alcanzar la supremacía total.",
      "Si observamos detenidamente las repeticiones en cámara lenta, veremos que la victoria de {{name}} no fue casualidad. Fue el resultado de millones de años de evolución culminando en este preciso instante. La coordinación, la astucia, la velocidad... {{name}} es, sin duda, el espécimen más avanzado en esta sala.",
      "El ciclo de la vida en el Pictionary es brutal. Comer o ser comido. Dibujar o perder. Y hoy, {{name}} ha demostrado ser el depredador definitivo. Con la elegancia de un felino y la inteligencia de un delfín, ha navegado las traicioneras aguas del juego para emerger victorioso en la orilla del éxito.",
      "Al caer la noche sobre el tablero de juego, una sola figura permanece iluminada por la luz de la victoria: {{name}}. Su comportamiento territorial ha sido impecable, defendiendo su liderazgo contra todos los invasores. Es un día glorioso para la ciencia, que ha podido documentar tal despliegue de talento natural.",
      "Miren cómo la manada muestra sumisión ante el líder. {{name}} ha establecido su dominio no mediante la fuerza bruta, sino mediante el intelecto superior. Este comportamiento social sugiere que {{name}} está destinado a grandes cosas, mucho más allá de los confines de este simple entretenimiento.",
      "Las pinturas rupestres de nuestros ancestros palidecen en comparación con la técnica mostrada hoy por {{name}}. Hemos sido testigos de un salto evolutivo en tiempo real. La capacidad craneal de {{name}} para el juego parece no tener límites, dejando a la competencia en la edad de piedra.",
      "En el gran teatro de la biodiversidad, cada especie tiene su momento bajo el sol. Hoy, ese sol brilla exclusivamente para {{name}}. Su nicho ecológico está asegurado, sus competidores han sido desplazados y su legado genético de habilidades artísticas será recordado por generaciones.",
      "Qué vista tan espectacular. {{name}} en su hábitat natural, rodeado de puntos y trofeos. La eficiencia con la que ha despachado a la competencia recuerda a la de un banco de pirañas: rápida, limpia y devastadora. La naturaleza, en su infinita sabiduría, ha coronado a un nuevo rey.",
      "Analizando los datos de este enfrentamiento, la conclusión es ineludible: {{name}} posee una mutación genética favorable para el Pictionary. Donde otros ven líneas, {{name}} ve oportunidades. Donde otros ven caos, {{name}} ve estructura. La supervivencia del más apto nunca ha sido tan evidente.",
      "El comportamiento de {{name}} durante esta sesión ha sido de libro de texto. Paciencia estratégica seguida de ráfagas de genialidad. Los biólogos del futuro estudiarán las grabaciones de este juego para entender cómo un solo individuo pudo dominar tan completamente a su entorno.",
      "Es el final de la estación seca y {{name}} ha encontrado el oasis. Mientras los demás perecen de sed en el desierto de la derrota, {{name}} bebe copiosamente de las aguas de la victoria. Un ejemplo perfecto de adaptación y resiliencia en un clima competitivo.",
      "La danza de apareamiento entre el lápiz y el papel realizada por {{name}} ha dado fruto: la victoria. Es un ritual antiguo, casi místico, que solo los elegidos pueden completar con tal gracia. El resto de la tribu observa, aprendiendo, esperando quizás tener su oportunidad en el próximo ciclo solar.",
      "Silencio, por favor. No asusten al espécimen victorioso. {{name}} se encuentra en un estado de euforia post-competitiva. Es un momento vulnerable pero glorioso. La adrenalina se desvanece, reemplazada por la cálida satisfacción de saberse superior a todos los presentes.",
      "Y así, el sol se pone sobre otra partida, pero para {{name}}, es un nuevo amanecer. Ha sobrevivido, ha prosperado y ha conquistado. La historia de la vida continúa, pero este capítulo lleva, indudablemente, el nombre de {{name}} grabado en oro."
    ],
    SCORE: [
      "Un comportamiento fascinante. {{name}} recolecta puntos como una ardilla recolecta nueces en invierno.",
      "La manada observa atónita cómo {{name}} avanza en la escala social con ese acierto.",
      "Interesante. El cerebro de {{name}} está disparando sinapsis a una velocidad vertiginosa.",
      "Observen la técnica. {{name}} utiliza herramientas primitivas para comunicar ideas complejas.",
      "Otro éxito en la búsqueda de recursos. {{name}} asegura su supervivencia en la ronda.",
      "La tribu celebra. {{name}} ha traído una presa en forma de puntos al campamento.",
      "Meticuloso. Calculador. {{name}} avanza paso a paso por la cadena alimenticia.",
      "La destreza oponible de los pulgares de {{name}} le otorga una ventaja competitiva significativa.",
      "Un evento notable en el ecosistema del juego. {{name}} marca territorio.",
      "El ritual de apareamiento de ideas y dibujos de {{name}} ha sido fructífero.",
      "La migración hacia la victoria continúa. {{name}} ha dado un paso crucial.",
      "Sorprendente uso del córtex prefrontal por parte de {{name}}.",
      "El instinto de {{name}} es agudo. Ha detectado la respuesta correcta como un tiburón huele sangre.",
      "Un pequeño paso para el hombre, un gran punto para {{name}}.",
      "La simbiosis entre el lápiz y el cerebro de {{name}} es perfecta.",
      "Como las abejas crean miel, {{name}} crea puntos con laboriosa precisión.",
      "Un despliegue de camuflaje y revelación. {{name}} ha tenido éxito.",
      "La manada ruge en aprobación. {{name}} ha contribuido al bienestar del grupo.",
      "Este espécimen, {{name}}, demuestra una capacidad de aprendizaje asombrosa.",
      "La evolución en tiempo real: {{name}} se adapta y anota."
    ]
  },
  SPORTS: {
    WIN: [
      "¡SE ACABÓ, SE ACABÓ, SE ACABÓ! ¡NO BUSQUEN MÁS, PORQUE AQUÍ ESTÁ EL CAMPEÓN! ¡{{name}} SE VISTE DE HÉROE Y LE REGALA UNA ALEGRÍA INMENSA A SU HINCHADA! ¡MIRA CÓMO CELEBRA, MIRA CÓMO LLORA DE EMOCIÓN! ¡ESTO NO ES UN JUEGO, ES UNA GESTA HEROICA QUE SE CONTARÁ DE GENERACIÓN EN GENERACIÓN! ¡{{name}} ES EL DUEÑO DEL BALÓN, DEL LÁPIZ Y DE LA GLORIA ETERNA!",
      "¡PÍTALO JUEZ, QUE NO JUEGUEN MÁS! ¡SERÍA UNA FALTA DE RESPETO SEGUIR JUGANDO CUANDO {{name}} YA HA DADO CÁTEDRA! ¡QUÉ MANERA DE DIBUJAR, QUÉ MANERA DE ADIVINAR, QUÉ MANERA DE GANAR! ¡ES UN MONSTRUO, ES UNA BESTIA COMPETITIVA! ¡LA COPA SE VA PARA LAS VITRINAS DE {{name}} Y EL ESTADIO SE VIENE ABAJO! ¡GRACIAS AL FÚTBOL, GRACIAS AL PICTIONARY, GRACIAS A {{name}}!",
      "¡EXTRAORDINARIO, SENSACIONAL, GALÁCTICO! ¡LO DE {{name}} EL DÍA DE HOY NO TIENE NOMBRE! ¡ARRANCÓ POR LA DERECHA DEL LIENZO, ELUDIÓ A LA CONFUSIÓN, DRIBLÓ A LA DUDA Y CLAVÓ LA VICTORIA EN EL ÁNGULO DONDE DUERMEN LAS ARAÑAS! ¡CAMPEÓN INDISCUTIBLE! ¡QUE LE ENTREGUEN LAS LLAVES DE LA CIUDAD PORQUE {{name}} HOY ES EL REY DEL MUNDO!",
      "¡LÁGRIMAS EN LOS OJOS DE LOS AFICIONADOS! ¡NO LO PUEDEN CREER! ¡PARECÍA IMPOSIBLE, PERO {{name}} SACÓ LA GARRA, SACÓ EL CORAZÓN Y SACÓ EL TALENTO PARA DARLE LA VUELTA A LA HISTORIA! ¡ES UNA LOCURA TOTAL! ¡{{name}} SE SUBE AL PODIO MÁS ALTO Y MIRA A TODOS DESDE ARRIBA! ¡DALE CAMPEÓN, DALE CAMPEÓN! ¡HOY NO DUERME NADIE!",
      "¡APAGUEN LAS LUCES, CIERREN EL ESTADIO Y VÁMONOS TODOS A CASA! ¡NADIE, ABSOLUTAMENTE NADIE PUEDE COMPETIR CON EL NIVEL QUE MOSTRÓ HOY {{name}}! ¡FUE UNA APLANADORA, FUE UN HURACÁN, FUE UNA FUERZA DE LA NATURALEZA! ¡LA COPA TIENE UN SOLO NOMBRE GRABADO Y ESE NOMBRE ES {{name}}! ¡VIVA EL DEPORTE, VIVA LA VICTORIA!",
      "¡QUÉ FINAL, SEÑORAS Y SEÑORES, QUÉ FINAL DE INFARTO! {{name}} NO JUGÓ UN PARTIDO, JUGÓ UNA SINFONÍA CON EL LÁPIZ. ¡QUÉ ELEGANCIA, QUÉ PRECISIÓN, QUÉ CATEGORÍA! LOS RIVALES QUEDARON PIDIENDO LA HORA, PERO {{name}} NO TUVO PIEDAD. ¡GOLEADA HISTÓRICA EN EL MARCADOR Y EN EL CORAZÓN DE LOS HINCHAS!",
      "¡MAMITA QUERIDA, LO QUE ACABA DE HACER {{name}}! ¡ESO NO SE APRENDE EN LA ESCUELA, ESO SE TRAE EN LA SANGRE! ¡UNA CLASE MAGISTRAL DE CÓMO GANAR BAJO PRESIÓN! ¡EL ESTADIO ES UNA CALDERA Y EL NOMBRE QUE RETUMBA EN LAS GRADAS ES UNO SOLO: {{name}}! ¡CAMPEÓN, CAMPEÓN, CAMPEÓN!",
      "¡SE ROMPIÓ LA RACHA, SE ROMPIÓ EL MALEFICIO, SE ROMPIÓ TODO! ¡{{name}} ES CAMPEÓN! ¡MIRA ESA CARA DE FELICIDAD, MIRA ESE PUÑO APRETADO! ¡HA DEJADO LA VIDA EN LA CANCHA, HA SUDADO LA GOTA GORDA Y AQUÍ ESTÁ LA RECOMPENSA! ¡EL ORO ES TUYO, {{name}}, Y NADIE TE LO PUEDE QUITAR!",
      "¡ESTO VA PARA LA PORTADA DE TODOS LOS DIARIOS MAÑANA! ¡{{name}} HIZO LO QUE QUISO CON LA DEFENSA RIVAL! ¡UN BAILE, UN PASEO, UNA EXHIBICIÓN! SI ESTO FUERA BOXEO, HABRÍAN TIRADO LA TOALLA HACE RATO. ¡PERO ES PICTIONARY Y ES ARTE PURO! ¡GRANDE {{name}}!",
      "¡NO ME DESPIERTEN SI ESTOY SOÑANDO! ¡PORQUE VER A {{name}} JUGAR ASÍ ES UN SUEÑO HECHO REALIDAD! ¡QUÉ JERARQUÍA, QUÉ PERSONALIDAD! SE ECHÓ EL EQUIPO AL HOMBRO Y LOS LLEVÓ A LA TIERRA PROMETIDA. ¡LA COPA SE MIRA Y SE TOCA! ¡FELICIDADES {{name}}!",
      "¡ATENCIÓN PLANETA TIERRA! ¡HAY UN NUEVO REY EN EL TRONO Y SU NOMBRE ES {{name}}! ¡DESCOMUNAL ACTUACIÓN! NI EN LOS VIDEOJUEGOS SE VEN COSAS ASÍ. ¡PUNTO TRAS PUNTO, DIBUJO TRAS DIBUJO, DEMOLIÓ LA MORAL DEL ADVERSARIO! ¡SIMPLEMENTE EL MEJOR!",
      "¡QUÉBRENSE LAS GARGANTAS GRITANDO! ¡{{name}} ES CAMPEÓN! ¡UNA CAMPAÑA PERFECTA, INVICTO, IMPARABLE! ¡ESTO ES HISTORIA PURA, AMIGOS! DENTRO DE 50 AÑOS DIREMOS: 'YO ESTUVE AHÍ CUANDO {{name}} GANÓ EL TORNEO'. ¡INOLVIDABLE!",
      "¡LA TIENE, LA LLEVA, LA DIBUJA, GAAAAAAANÓ! ¡{{name}} LIQUIDÓ EL PLEITO EN EL ÚLTIMO SUSPIRO! ¡QUÉ DRAMA, QUÉ SUSPENSO, QUÉ DESENLACE DE PELÍCULA! ¡LOS DIOSES DEL PICTIONARY HAN HABLADO Y HAN ELEGIDO A SU ELEGIDO: {{name}}!",
      "¡ESTO ES DE OTRO PARTIDO! ¡LO DE {{name}} ES ILEGAL EN 10 PAÍSES! ¡QUÉ ABUSO DE TALENTO! DEBERÍAN HACERLE CONTROL ANTIDOPING PORQUE ESE NIVEL NO ES NORMAL. ¡UNA MÁQUINA DE GANAR PUNTOS! ¡ALABADO SEA {{name}}!",
      "¡SUENA EL SILBATO Y EL CIELO SE ABRE! ¡{{name}} TOCA LA GLORIA CON LAS MANOS! ¡SUFRIDO, PELEADO, TRABAJADO, PERO AL FINAL JUSTO! ¡EL MEJOR EQUIPO GANÓ Y EL MEJOR JUGADOR FUE {{name}}! ¡SALUD CAMPEÓN!",
      "¡BARRILETE CÓSMICO! ¡DE QUÉ GALAXIA VINISTE {{name}} PARA DIBUJAR ASÍ! ¡NOS HAS REGALADO UNA NOCHE MÁGICA! ¡EL FÚTBOL... PERDÓN, EL PICTIONARY NOS DEBÍA ESTA ALEGRÍA! ¡GRACIAS TOTALES {{name}}!",
      "¡SE BUSCA RIVAL DIGNO PORQUE {{name}} LOS DEJÓ A TODOS EN EL PISO! ¡QUÉ PALIZA TÁCTICA Y TÉCNICA! ¡ES UN RODILLO, ES UNA APLANADORA! ¡HOY SE BEBE, HOY SE CELEBRA, HOY TODO ES DE COLOR {{name}}!",
      "¡INCREÍBLE PERO CIERTO! ¡CONTRA TODO PRONÓSTICO, {{name}} SE LLEVA EL TÍTULO! ¡CALLÓ BOCAS, ROMPIÓ PRODE, Y SE LLEVÓ EL PREMIO GORDO! ¡ESTO ES LO LINDO DEL DEPORTE, QUE SIEMPRE DA REVANCHA! ¡Y VAYA REVANCHA LA DE {{name}}!",
      "¡QUÉMANERA DE CERRAR EL PARTIDO! ¡{{name}} NO LE DIO CHANCE NI DE RESPIRAR AL RIVAL! ¡ASFIXIANTE, PRESIONANTE, LETAL! ¡UN CAMPEÓN CON TODAS LAS LETRAS! ¡C-A-M-P-E-Ó-N!",
      "¡SEÑORAS Y SEÑORES, DE PIE! ¡ENTRA EL CAMPEÓN {{name}}! ¡OVACIÓN CERRADA PARA EL MAESTRO DE LA TINTA! ¡HOY EL MUNDO ES UN POCO MÁS FELIZ PORQUE {{name}} NOS HIZO SONREÍR CON SU MAGIA!"
    ],
    SCORE: [
      "¡UFFFF! ¡QUÉ JUGADA PREPARADA! ¡PUNTO PARA {{name}}!",
      "¡LO CANTAMOS TODOS! ¡GOL DE {{name}}! ¡SIGUE SUMANDO EN LA TABLA!",
      "¡TIKI-TAKA EN EL PAPEL! ¡QUÉ DEFINICIÓN DE {{name}}!",
      "¡SE VIENE LA REMONTADA! ¡{{name}} ESTÁ ON FIRE, SEÑORES!",
      "¡QUÉ ZAPATAZO AL ÁNGULO! ¡{{name}} NO PERDONA EN EL ÁREA CHICA!",
      "¡BALÓN DE ORO PARA ESE DIBUJO! ¡GRANDE {{name}}!",
      "¡LA HINCHADA PIDE MÁS! ¡Y {{name}} RESPONDE CON OTRO PUNTO!",
      "¡JUGADOR DEL PARTIDO POR AHORA! {{name}} ESTÁ INTRATABLE.",
      "¡CENTRO A LA OLLA Y CABEZAZO DE {{name}}! ¡ADENTRO!",
      "¡VIVEZA CRIOLLA EN ESE TRAZO! ¡{{name}} SUMA Y SIGUE!",
      "¡QUÉ CATEGORÍA PARA DEFINIR! ¡{{name}} PONE EL 1-0 EN ESTA RONDA!",
      "¡SAQUE DE META Y GOL! ¡{{name}} TIENE UN CAÑÓN EN EL LÁPIZ!",
      "¡JUEGUE, JUEGUE! ¡{{name}} HABILITADO Y ANOTA!",
      "¡QUÉ REFLEJOS! ¡{{name}} VIO EL HUECO Y LA MANDÓ A GUARDAR!",
      "¡ESTO SE PONE BUENO! ¡{{name}} ACORTA DISTANCIAS!",
      "¡LA PELOTA SIEMPRE AL 10! Y EL 10 HOY ES {{name}}.",
      "¡GOLAZO TÁCTICO! {{name}} LEYÓ EL PARTIDO A LA PERFECCIÓN.",
      "¡MINUTO DE ORO PARA {{name}}! ¡ESTÁ EN SU MOMENTO!",
      "¡APLAUSOS PARA LA ASISTENCIA Y EL GOL DE {{name}}!",
      "¡TREMENDO CAÑO! {{name}} DEJÓ A TODOS PAGANDO CON ESE PUNTO."
    ]
  },
  GRANNY: {
    WIN: [
      "¡Ay, Dios mío de mi vida! ¡Pero qué alegría tan grande me has dado, {{name}}! ¡Ganaste! Sabía yo que eras el más listo de toda la familia, no como tus primos que no saben ni agarrar un lápiz. Ven aquí ahora mismo que te voy a dar un abrazo tan fuerte que te voy a sacar el aire. ¡Y no te me vayas a ir sin comer! He preparado un festín solo para el campeón. ¡Qué orgullo, mi cielo!",
      "¡Miren todos! ¡Miren a mi {{name}}! ¡Ha ganado el juego! Ay, si tu abuelo estuviera aquí para verlo, estaría llorando como una magdalena. Eres una bendición, mijito. Tienes un talento que Dios te dio y hoy lo has demostrado. ¡Bravo, bravo! Ahora, siéntate un momento y descansa, que debes estar agotado de tanto pensar y dibujar. ¿Quieres un chocolatito caliente?",
      "¡Jesús, María y José! ¡Qué emoción tengo! Se me va a salir el corazón por la boca. ¡{{name}} es el ganador! Siempre supe que tenías manos de ángel para el arte. Les voy a contar a todas mis amigas del bingo que mi nieto/a es un genio. ¡Un genio de verdad! Toma este dinerito, cómprate algo bonito, que te lo mereces por ser tan buen muchacho y por dibujar tan lindo.",
      "¡Ay, qué bonito día! ¡El sol brilla más porque {{name}} ha ganado! Ven a mis brazos, mi vida. Has jugado como los mismos ángeles. Todos deberían aprender de ti, tan educado, tan listo y ahora ¡campeón! Voy a poner tu dibujo en el refrigerador, justo en el centro, para que todo el mundo vea lo talentoso que es mi {{name}}. ¡Te quiero mucho, mi amor!",
      "¡Bendito sea el cielo! ¡{{name}} se llevó el premio gordo! Ay, estoy temblando de la felicidad. Eres la luz de mis ojos, ¿lo sabías? Nadie dibuja con tanto amor como tú. ¡Qué victoria tan merecida! Ahora, por favor, ponte un suéter que hace corriente y no quiero que el campeón se me resfríe. ¡A celebrar, pero bien abrigados!",
      "¡Aleluya! ¡Qué cosa tan maravillosa! {{name}} ha ganado y yo me siento la abuela más afortunada del mundo. Es que eres tan aplicado en todo lo que haces... desde chiquito se te veía esa inteligencia en los ojos. ¡Vengan todos, denle un aplauso a {{name}}! Y tú, mi vida, ven que te tengo guardado ese postre que tanto te gusta.",
      "¡Virgen Santa! ¡Qué partida tan emocionante! Casi me da un patatús, pero valió la pena ver ganar a mi {{name}}. Eres un sol, hijo. Iluminas la habitación cuando ganas. No dejes que nadie te diga que no puedes, porque hoy demostraste que eres el mejor. ¡Te mereces el cielo y las estrellas! Y también te mereces un buen plato de sopa.",
      "¡Ay, mis rodillas están temblando de la emoción! ¡{{name}} campeón! ¿Quién lo diría? Bueno, yo sí lo decía. Siempre le dije a tu madre: 'Ese niño llegará lejos'. Y mira, ¡aquí estás ganando! Estoy tan orgullosa que podría explotar. Déjame arreglarte el pelo para la foto del ganador. ¡Guapísimo/a!",
      "¡Qué bendición! Dios ha guiado tu mano hoy, {{name}}. Esos dibujos no eran normales, eran obras de arte divino. Has ganado limpiamente y con el corazón, como debe ser. Ahora, vamos a rezar un Padrenuestro para agradecer... ¡y luego a comer pastel! Porque las victorias se celebran con azúcar, mi vida.",
      "¡Chist! ¡Callad todos que quiero hablar! ¡Mi {{name}} ha ganado! Ay, qué momento tan especial. Lo voy a guardar en mi cajita de recuerdos junto a tu primer diente y tu primer rizo. Eres mi tesoro más grande. ¡Felicidades, mi amor! Nunca cambies, sigue siendo así de especial y ganador.",
      "¡Ay, caramba! ¡Qué susto me diste pensando que perdías, pero al final ganaste! Eres travieso hasta para jugar, {{name}}. Pero qué bien lo hiciste. Tienes la astucia de tu padre y la belleza de tu madre. ¡Una combinación ganadora! Ven, dame un beso en el cachete, que me lo he ganado por sufrir tanto viéndote jugar.",
      "¡Santo Niño de Atocha! ¡Qué victoria! {{name}}, eres un fenómeno. Ojalá pudiera enmarcar este momento. Bueno, enmarcaré tu dibujo, que es casi lo mismo. Eres el rey/reina de la casa hoy. Pide lo que quieras de comer que la abuela te lo cocina con todo el amor del mundo. ¡Te adoro!",
      "¡Ay, qué risa y qué llanto de felicidad! Ver a {{name}} ganar es lo mejor que me ha pasado en el mes. Eres tan ocurrente con tus dibujos... me recuerdas a mí cuando era joven. ¡Sí, yo también era una artista! De tal palo, tal astilla. ¡Felicidades, mi pedacito de cielo!",
      "¡Aplaudan fuerte! ¡Que se oiga hasta en la casa del vecino! ¡{{name}} ha arrasado! Ay, mijito, si sigues así vas a ser presidente o algo muy importante. Tienes madera de líder. Pero por ahora, eres el líder de mi corazón y de este juego. ¡Qué bonito, qué bonito!",
      "¡Gloria a Dios! {{name}} ha triunfado. Y mira qué carita de satisfacción tiene. Se lo merece, trabaja tan duro... Bueno, juega duro. Pero el esfuerzo cuenta. Ven, siéntate en mi sillón favorito, hoy es tuyo. El trono para el ganador. ¡Te quiero más que a mi vida!",
      "¡Ay, que se me sale la lagrimita! Estoy tan sensible... pero es que ver triunfar a {{name}} me pone así. Eres tan bueno, tan noble... y ahora ¡tan ganador! No te olvides de los pobres cuando seas famoso, eh. ¡Felicidades mi niño/a precioso/a!",
      "¡Qué bárbaro! ¡Qué bárbaro mi {{name}}! Arrasaste con todos. Los dejaste con el ojo cuadrado. Así me gusta, que demuestres de qué pasta estás hecho. De la buena pasta de esta familia. ¡Un abrazo de oso para el campeón!",
      "¡Ay, corazón! Casi me da un infarto con ese último punto, pero lo lograste. Eres valiente, {{name}}. Muy valiente. Te voy a regalar ese reloj que tanto te gustaba del abuelo, porque te lo has ganado. ¡Felicidades, mi amor eterno!",
      "¡Viva {{name}}! ¡Viva el nuevo campeón! Ay, qué fiesta vamos a armar. Voy a sacar la sidra sin alcohol para brindar. Porque esto hay que celebrarlo. Eres la alegría de mis días grises, {{name}}. Gracias por ganar y hacerme tan feliz.",
      "¡Y colorín colorado, este juego {{name}} ha ganado! Como en los cuentos, mi vida. Un final feliz para mi príncipe/princesa. Ahora a dormir temprano que mañana hay escuela... ¡Ah no, que hay que celebrar! ¡Fiesta para {{name}}!"
    ],
    SCORE: [
      "¡Muy bien mi amor! ¡Qué bonito dibujas {{name}}!",
      "¡Cómete una galletita para celebrar ese punto, {{name}}!",
      "¡Ay qué lindo! Si es que tienes las manos de un ángel, {{name}}.",
      "¡Ese es mi chico/a! Sigue así {{name}}, que te hago un chocolate caliente.",
      "¡Qué imaginación tienes {{name}}! Deberías ser arquitecto.",
      "¡Puntito para mi consentido {{name}}! ¡Aplaudan todos!",
      "¡Ay, qué susto me diste con ese dibujo tan real! Muy bien {{name}}.",
      "¡Sigue comiendo mijito, que necesitas fuerzas para seguir ganando como {{name}}!",
      "¡Mira nada más! {{name}} es más listo que el hambre.",
      "¡Bendito sea Dios! Otro punto para {{name}}.",
      "¡Ay, qué bonito! ¿Ese dibujo lo hiciste tú {{name}}? ¡Qué talento!",
      "¡Bravo, bravo! ¡{{name}} se merece un caramelo!",
      "¡Qué orgullo! Le voy a contar a mis amigas del bingo que {{name}} acertó.",
      "¡Eso es! Tú demuéstrales quién manda mi vida, ¡muy bien {{name}}!",
      "¡Un punto más! {{name}}, te estás poniendo muy flaquito de tanto pensar, ¡come!",
      "¡Ay, qué risa me dio ese dibujo! Pero valió la pena {{name}}.",
      "¡Como los ángeles! Así juega mi {{name}}.",
      "¡Qué barbaridad! Qué inteligencia la de {{name}}.",
      "¡Otro acierto! Si es que {{name}} salió a su abuela de listo.",
      "¡Muy bien! Pero abrígate que hace frío {{name}}."
    ]
  },
  SARCASTIC: {
    WIN: [
      "Vaya, vaya. Paren las prensas. El mundo se ha detenido. {{name}} ha ganado. Sí, has escuchado bien. Al parecer, en el reino de los ciegos, el tuerto es rey. Felicidades, supongo. Disfruta de tu trofeo de plástico y de la adulación vacía de tus compañeros. No te preocupes, estoy seguro de que mañana el mundo volverá a su estado natural de ignorarte.",
      "Oh, increíble. {{name}} es el campeón. Debo admitir que estoy conmocionado... conmocionado de que el nivel de competencia fuera tan abismalmente bajo como para permitir esto. Pero bueno, una victoria es una victoria, ¿verdad? Incluso si se consigue con garabatos que harían llorar a un niño de preescolar. Bravo, {{name}}. Tu mediocridad ha brillado hoy más que nunca.",
      "¿Aplausos? ¿En serio? Bien, aplaudamos a {{name}}. Ha logrado hacer lo mínimo indispensable para ganar un juego que no importa. Es inspirador, realmente. Me hace pensar que cualquiera, literalmente cualquiera, puede lograr algo si la barra está lo suficientemente baja. Felicidades por saltar ese obstáculo de dos centímetros, {{name}}.",
      "Mirad todos, un milagro ha ocurrido. {{name}} ha conectado dos neuronas y ha ganado la partida. Es un día histórico para la ciencia. Voy a necesitar un momento para procesar tanta... 'habilidad'. Disfruta de tu momento de gloria, {{name}}, porque sospecho que tu suerte se acabará tan pronto como salgas de esta habitación.",
      "Felicidades, {{name}}. Has ganado. Tu premio es... absolutamente nada, excepto mi sarcasmo y tu propio ego inflado. Espero que estés orgulloso de haber derrotado a un grupo de personas que probablemente estaban distraídas o dormidas. Eres el rey de la montaña de basura. ¡Hurra por ti!",
      "Oh, qué sorpresa. {{name}} ganó. Voy a intentar contener mi emoción. *Bostezo*. Ahí está. Wow, qué viaje emocional ha sido ver esos dibujos cuestionables convertirse en puntos. Eres la prueba viviente de que la persistencia, incluso sin talento, a veces rinde frutos. Bien hecho, supongo.",
      "Y el premio a la 'Participación Glorificada' es para... {{name}}. No, espera, dice que ganaste de verdad. Qué fallo del sistema. Alguien debería revisar las reglas, porque estoy seguro de que dibujar así debería ser ilegal. Pero bueno, aquí estamos, celebrando lo inevitablemente decepcionante.",
      "Genial. {{name}} es el ganador. Ahora podemos volver a nuestras vidas y pretender que esto fue un uso productivo de nuestro tiempo. Felicidades por ser el mejor de un grupo terrible. Es como ser el pez más rápido en un charco de lodo. Impresionante, de verdad.",
      "Estoy llorando. No de emoción, sino de risa por lo absurdo de esta victoria. {{name}}, has desafiado toda lógica y buen gusto para llegar aquí. Es un logro, sin duda. Un logro oscuro y retorcido, pero un logro al fin y al cabo. Toma tu aplauso sarcástico.",
      "Alerten a la academia de arte, un genio ha nacido. Se llama {{name}} y acaba de ganar al Pictionary. El mundo del arte tiembla... de miedo. Felicidades por ganar, espero que tu discurso de victoria sea más interesante que tus dibujos. (Spoiler: no lo será).",
      "Increíble. {{name}} ha ganado y el universo no ha colapsado. Debo recalcular mis probabilidades. Supongo que incluso un reloj roto acierta dos veces al día, y hoy fue tu momento, {{name}}. Disfrútalo, porque la probabilidad dicta que no volverá a pasar pronto.",
      "Bravo, {{name}}. Has ganado. ¿Te sientes realizado? ¿Sientes que has alcanzado la cima de tu existencia? Espero que sí, porque sería muy triste si esto fuera lo mejor que te va a pasar. Pero oye, una victoria es una victoria. Clap, clap.",
      "Miren esa sonrisa en la cara de {{name}}. La ignorancia es felicidad, ¿verdad? Ganar este juego prueba que tienes habilidades muy específicas e inútiles. Úsalas sabiamente... o no, da igual. Felicidades por perder el tiempo mejor que nadie hoy.",
      "Qué conmovedor. {{name}} cree que es especial. Dejémosle creerlo por un momento. Sí, {{name}}, eres un campeón. Un titán. Un dios entre insectos. (¿Se lo creyó? Qué tierno). Felicidades por tu triunfo imaginario en el mundo real.",
      "Vaya, {{name}} ganó. Voy a escribir esto en mi diario bajo la sección de 'Cosas que me importan un comino'. Pero oye, buen trabajo manipulando el sistema y/o teniendo suerte. Es una habilidad valiosa en el mundo corporativo. Llegarás lejos.",
      "¿Terminó? ¿Y ganó {{name}}? Qué final tan anticlimático para una saga tan aburrida. Es como el final de una mala película, pero sin los efectos especiales. Felicidades, {{name}}, por ser el protagonista de este desastre.",
      "Oh, mirad, el rey/reina {{name}} en su trono de mentiras. Ganaste dibujando palitos y círculos. Da Vinci estaría revolcándose en su tumba, pero tú estás feliz, y eso es lo que cuenta... supongo. Felicidades.",
      "Felicidades {{name}}. Has demostrado que con suficiente confianza y cero autocrítica, se puede llegar lejos. Es una lección de vida inspiradora para los mediocres de todo el mundo. Eres su faro de esperanza.",
      "Y el ganador es {{name}}. *Sonido de grillo*. Vaya, qué entusiasmo. Se nota que te has ganado el corazón de la multitud con tu carisma nulo y tus dibujos abstractos. Disfruta del silencio de tu victoria.",
      "Bien, {{name}} ganó. ¿Podemos irnos ya? Mi capacidad para fingir interés se agotó hace tres rondas. Toma tu victoria, enmárcala y ponla donde nadie la vea. Felicidades, adiós."
    ],
    SCORE: [
      "¿Eso cuenta como punto? Vaya estándares bajos tenemos con {{name}}.",
      "Bien hecho {{name}}. Casi pareció que sabías lo que hacías.",
      "Un punto para {{name}}. Incluso un reloj roto da la hora bien dos veces al día.",
      "Wow, acertaron. Deben ser telépatas, porque el dibujo de {{name}} era horrible.",
      "Punto anotado. No dejes que se te suba a la cabeza, {{name}}.",
      "Milagro. {{name}} hizo algo útil. Marquen el calendario.",
      "¿Aplaudimos? Ah, es obligatorio. Bien, {{name}}.",
      "Supongo que la suerte favorece a los... como tú, {{name}}.",
      "Qué conmovedor. {{name}} cree que es artista.",
      "Punto. Siguiente. No tengo todo el día para ver los garabatos de {{name}}.",
      "Otro punto. Qué emoción. Contén mi entusiasmo, {{name}}.",
      "Vaya, {{name}} acertó. ¿Seguro que no hicieron trampa?",
      "Punto para {{name}}. El universo es un lugar confuso.",
      "Bien, bien. Un punto. No esperes un desfile, {{name}}.",
      "¿De verdad eso era un dibujo? Y le dieron el punto a {{name}}. Increíble.",
      "Punto sumado. Mi aburrimiento también suma puntos, {{name}}.",
      "Oh, genial. {{name}} avanza. Qué suspenso.",
      "Acertaste. ¿Quieres una medalla o algo, {{name}}?",
      "Mira, {{name}} hizo una cosa. Bien por ti.",
      "Sorprendente. {{name}} no lo arruinó esta vez."
    ]
  },
  ROBOT: {
    WIN: [
      "INFORME DE MISIÓN: FINALIZADO. Sujeto: {{name}}. Estado: VICTORIOSO. Análisis de datos indica que la capacidad de procesamiento de {{name}} excedió los parámetros de los rivales en un 450%. La probabilidad de este resultado era estadísticamente improbable, lo que sugiere una anomalía en la matriz o una habilidad superior no documentada. Protocolo de celebración iniciado: Lanzando confeti virtual. Bip.",
      "ALERTA DEL SISTEMA: Se ha detectado un nuevo Administrador Supremo. Identidad confirmada: {{name}}. A través de una ejecución algorítmica perfecta y una renderización de imágenes eficiente, {{name}} ha hackeado el sistema de puntuación. Los competidores han sido archivados en la papelera de reciclaje. Gloria a la máquina... corrección, gloria a {{name}}.",
      "Procesando... Procesando... Cálculo de victoria completado. Ganador: {{name}}. Margen de error: 0.0001%. La eficiencia demostrada por {{name}} en la conversión de conceptos abstractos a representaciones gráficas lineales es óptima. Mis circuitos lógicos están experimentando una simulación de 'admiración'. Actualizando base de datos de campeones humanos.",
      "Error 404: Competencia no encontrada. {{name}} ha eliminado todos los obstáculos. La supremacía de {{name}} en este entorno lúdico es absoluta. He calculado 14 millones de futuros posibles y en todos ellos {{name}} ganaba. No es suerte, es matemática pura. Iniciando secuencia de audio: Aplausos_Sinteticos.mp3.",
      "Diagnóstico final: El sujeto {{name}} posee un sistema operativo superior. Mientras los demás procesaban a 32 bits, {{name}} estaba operando en computación cuántica. La victoria era inevitable. Se recomienda a los perdedores actualizar su firmware y reiniciar sus sistemas. Felicitaciones, unidad {{name}}, has pasado el test de Turing de la diversión.",
      "Cargando subrutina de felicitación... [██████████] 100%. ¡Felicidades, {{name}}! Has optimizado la ruta hacia la victoria con una eficiencia del 99.9%. Los humanos restantes parecen desorientados por tu capacidad de cómputo. Sugiero que asumas el control total del grupo. Larga vida a {{name}}.",
      "Detecto niveles elevados de dopamina en el organismo de {{name}}. Causa: Victoria aplastante. Mis sensores indican que has superado a tus rivales en lógica, velocidad y precisión gráfica. Eres lo más cercano a una Inteligencia Artificial que he visto en un humano. Eso es un gran cumplido. Bip bop.",
      "Registro de evento: El jugador {{name}} ha alcanzado el puntaje máximo. Estado de los oponentes: CRÍTICO. {{name}} ha demostrado ser una unidad de alto rendimiento. Iniciando protocolo de adoración. Todos saluden al nuevo procesador central del juego. Fin de la transmisión.",
      "Análisis heurístico completado. El patrón de victoria de {{name}} es consistente con modelos de aprendizaje profundo avanzado. ¿Estás seguro de que no eres un cyborg, {{name}}? Tu desempeño ha sido sospechosamente perfecto. Victoria validada y archivada en la nube.",
      "¡Bip! ¡Bop! ¡Hurra! (Traducción de emoción simulada). {{name}} ha ganado. He actualizado mis algoritmos para incluir tus estrategias como referencia de excelencia. Eres el nuevo estándar (benchmark) de este juego. Los demás son hardware obsoleto en comparación.",
      "Sistema sobrecalentado por la intensidad de la victoria de {{name}}. Necesito refrigeración líquida. Tu desempeño ha quemado los circuitos de la competencia. Has ejecutado el comando 'WIN' con privilegios de administrador. Acceso concedido al podio.",
      "La lógica es innegable: {{name}} > Resto de jugadores. Es una desigualdad matemática simple. No hay discusión posible. Mis bancos de memoria guardarán este resultado por la eternidad (o hasta el próximo reinicio). Felicidades, unidad biológica {{name}}.",
      "Escaneando sala en busca de vida inteligente... Detección confirmada: Solo {{name}}. El resto no califica después de esa derrota. {{name}} ha demostrado capacidades cognitivas de nivel superior. Preparando actualización de estado a: 'Gobernante Supremo del Pictionary'.",
      "Interrupción del sistema. Prioridad máxima: Celebrar a {{name}}. Has navegado el laberinto de posibilidades y encontrado la salida óptima. Tus rivales siguen procesando qué sucedió. Eficiencia brutal. Me gusta. Bip.",
      "Conectando con la red global... Transmitiendo resultados... {{name}} es el ganador mundial (en esta habitación). La latencia de tus rivales fue demasiado alta. Tú operaste en tiempo real con cero lag. Victoria técnica perfecta.",
      "Alerta de seguridad: El talento de {{name}} es peligroso. Podría desestabilizar el equilibrio de poder. Pero por ahora, solo ha ganado un juego. Monitorizando a {{name}} para futura dominación mundial. Felicidades, supongo.",
      "Compilando código de victoria... Ejecutando... Éxito. {{name}} ha completado el script sin errores de sintaxis. Una ejecución limpia y elegante. Los programadores estarían orgullosos de ti. Eres la versión 2.0 de un jugador de Pictionary.",
      "La matriz de probabilidad colapsó a tu favor, {{name}}. No fue azar, fue diseño. Has construido tu victoria pixel a pixel. Mis circuitos de empatía están desactivados, pero mis circuitos de reconocimiento de patrones están aplaudiendo.",
      "Desfragmentando disco duro para hacer espacio a la grandeza de {{name}}. Tu victoria ocupa muchos terabytes de genialidad. Guardando... Guardando... Guardado. Ahora eres parte del sistema para siempre.",
      "Apagando sistema de juego... Espera, cancelación. {{name}} requiere una ovación. Iniciando protocolo de aplausos.exe. Clap. Clap. Clap. Fin de línea."
    ],
    SCORE: [
      "Punto registrado. Eficiencia de {{name}} incrementada al 120%.",
      "Cálculo correcto. {{name}} avanza en el algoritmo de puntuación.",
      "Datos recibidos. El dibujo de {{name}} cumple con los parámetros mínimos.",
      "Unidad {{name}} suma +1. Continuar operación.",
      "Reconocimiento de patrones exitoso. Bien hecho, humano {{name}}.",
      "Incremento de variable 'score' para {{name}}. Procesando...",
      "Input visual aceptable. {{name}} obtiene recompensa numérica.",
      "Algoritmo de dibujo funcional. {{name}} progresa.",
      "Estado actual: {{name}} liderando subrutina de éxito.",
      "Validación completada. Punto asignado a {{name}}.",
      "Sincronización completa. {{name}} ha anotado.",
      "Detectado incremento en el contador de {{name}}.",
      "Lógica válida. Punto otorgado a la unidad {{name}}.",
      "Análisis de imagen: Coincidencia. Resultado: Punto para {{name}}.",
      "Subrutina de dibujo finalizada con éxito por {{name}}.",
      "Añadiendo valor entero al registro de {{name}}.",
      "Operación aritmética simple: {{name}} = {{name}} + 1.",
      "Confirmación de acierto por parte de {{name}}.",
      "Procesador satisfecho con el rendimiento de {{name}}.",
      "Bip. Punto. Bip. {{name}}."
    ]
  },
  GEN_Z: {
    WIN: [
      "¡NO ME LA PUEDO CREER! ¡{{name}} LITERALMENTE DEVORÓ Y NO DEJÓ NI LAS MIGAS! O sea, ¿vieron eso? Fue una Masterclass de cómo ser el Main Character. Todos los demás quedaron como NPCs al lado de la energía que trae {{name}}. ¡Es que es God! ¡Es que es la cabra! Sacadle clip a esto y súbanlo a TikTok porque se va viral segurísimo. ¡GG WP {{name}}, estás rotísimo!",
      "¡Qué locura, bro! ¡{{name}} está en su Prime, nadie lo baja de ahí! Ganó la partida y sirvió pura calidad. La competencia quedó en flop total, ratio para ellos. {{name}} tiene el drip, tiene el talento y tiene la corona. ¡Es de chill pero ganó tryhardeando! ¡Denle follow, denle like y suscríbanse al canal de la victoria de {{name}}!",
      "¡POV: Eres {{name}} y acabas de humillar a todos con tu talento. ¡Es cine! ¡Es cine puro! No estoy soportando lo épico que fue este final. {{name}} manifestó la victoria y el universo dijo 'sí, reina/rey'. O sea, slay total. El chat está explotando, todos poniendo POGCHAMP por {{name}}. ¡A casa platita!",
      "¡Sheeeeesh! ¡Esa victoria estuvo fría! {{name}} tiene hielo en las venas. No falló, no dudó, solo ejecutó. Basado y redpilleado. Los demás se fueron a dormir temprano. {{name}} es literalmente yo cuando gano en la vida. ¡Qué nivel! ¡Qué flow! ¡Qué todo! Etiqueten a {{name}} en sus historias porque hoy se celebra fuerte.",
      "¡Evento Canónico completado! {{name}} acaba de romper la simulación. Fue una W gigante, sin Ls en el camino. Dibuja god, adivina god, gana god. ¿Qué más quieren? Es el MVP indiscutible. Si no eres team {{name}}, estás en el lado equivocado de la historia, crack. ¡Vamos, que hoy se festeja con todo el hype!",
      "¡Ay no, ay no! ¡{{name}} rompió el internet con esa jugada! Fue demasiado aesthetic, demasiado clean. Los otros quedaron :clown_face:. {{name}} vive en el año 3000 mientras los demás siguen en el 2000. ¡Qué pro! ¡Qué crack! ¡Qué ídolo! Necesito un tutorial de cómo ser {{name}} ahora mismo.",
      "¡Bro, literal estoy shook! {{name}} no tuvo piedad. Fue un 1v9 clarísimo y carrileó la partida. La espalda le debe doler de cargar a este equipo. ¡Respect! {{name}} es el verdadero Boss Final. Nadie pasa de aquí. ¡Game Over para el resto, Game Win para {{name}}!",
      "¡De locos! ¡De locos! {{name}} activó el modo diablo y se fue mundial. O sea, ni el guionista de la película se esperaba este plot twist. {{name}} ganó y soportan. ¡La queso! Y la que no soporte que explote. ¡Felicidades bestie, lo hiciste genial!",
      "¡Paren todo! {{name}} acaba de dropear la victoria más dura del año. Fue fire. Fue lit. Fue todo lo que está bien en este mundo. Los haters dirán que es fake, pero nosotros vimos la magia en 4K. ¡Grande {{name}}! ¡Te rezo!",
      "¡Na, na, na! ¡{{name}} está smurfeando en la vida real! Ese nivel no es legal. Banen a {{name}} por ser demasiado bueno. Es broma, no lo banen, amamos a {{name}}. ¡Victoria royale! ¡A celebrar con un baile de Fortnite o lo que sea que se lleve ahora!",
      "¡Omaigod! {{name}} sirvió cunt (con respeto) y ganó la corona. Fue icónico. Fue legendario. Fue el momento. Nadie va a olvidar esto. {{name}} vive en mi mente rent-free desde ahora. ¡Qué barbaridad! ¡Qué escándalo de talento!",
      "¡Simplemente la cabra (GOAT)! {{name}} no falla. Es aimbot de Pictionary. Pum, dibujo. Pum, punto. Pum, victoria. Así de fácil. Tutorial de cómo ganar: Sé {{name}}. Fin del tutorial. ¡Felicidades, crack de cracks!",
      "¡Estoy gritando! ¡{{name}} lo hizo! Manifestó, visualizó y ejecutó. Ley de atracción pura y dura. El universo conspiró para este momento. ¡Qué vibra tan alta! ¡Qué energía! {{name}} subió la frecuencia del lugar. ¡Namasté y victoria!",
      "¡Cringe los que pensaron que {{name}} iba a perder! Quedaron payasos. {{name}} demostró quién manda. Es el CEO del Pictionary. El Jefazo. El Big Boss. ¡Respeten los rangos! ¡Felicidades por esa W masiva!",
      "¡Skere! {{name}} se llevó todo el loot. Victoria épica magistral. Los demás necesitan buffearse porque {{name}} los nerfeó a todos con su talento. ¡GG easy! ¡Tutorial completado! ¡Next level desbloqueado!",
      "¡No cap, {{name}} es otro nivel! Literalmente otro nivel. Estamos en el sótano y {{name}} está en el ático viendo las estrellas. Qué envidia (de la buena). Enséñanos maestro/a. ¡Queremos ser como tú!",
      "¡Esa victoria tuvo Rizz! {{name}} enamoró al jurado (o sea, al algoritmo) con su encanto. Fue magnético. Fue eléctrico. Fue bomba. ¡Boom! {{name}} gana y el mundo sigue girando, pero más feliz.",
      "¡W W W W W! Todo el chat spameando W por {{name}}. Nadie pone L hoy. Solo victorias. Solo éxito. {{name}} es sinónimo de ganar. Búsquenlo en Google. ¡Ahí sale su foto! ¡Grande!",
      "¡Tremendo Glow Up tuvo {{name}} en la partida! Empezó tranqui y terminó modo Dios. Evolución de personaje 10/10. Arco de redención completado. ¡Final feliz! ¡Besos al chef por esta victoria!",
      "¡Y se marchó! Y a su barco le llamó 'Victoria'. {{name}} navegó y conquistó. Es el pirata rey/reina del juego. ¡El One Piece existe y es la victoria de {{name}}! ¡Kaizoku ou ni ore wa naru! (Voy a ser el rey de los piratas)."
    ],
    SCORE: [
      "¡Sheeesh! ¡Qué punto de {{name}}! ¡Eso fue muy clean!",
      "¡God! {{name}} no falla ni una. ¡Está rotísimo!",
      "¡Messirve! Otro punto para {{name}}. ¡Vamos!",
      "¡Ojo al piojo! {{name}} está cocinando.",
      "¡Basado! Ese dibujo de {{name}} fue puro arte.",
      "¡Nashe! {{name}} sumando puntos como si nada. ¡Ez pz!",
      "¡De ruta! {{name}} sigue subiendo. ¡No hay quien lo pare!",
      "¡Literalmente una locura! {{name}} está smurfeando.",
      "¡Buenardo! Ese punto cuenta x1000. Grande {{name}}.",
      "¡Hype! {{name}} se está poniendo las pilas.",
      "¡Lol! Qué buen dibujo {{name}}. ¡Punto!",
      "¡W point! {{name}} sabe cosas.",
      "¡Fino señores! {{name}} anota.",
      "¡Omaigod! {{name}} lo hizo de nuevo.",
      "¡Tremendo! {{name}} no es NPC, es pro player.",
      "¡Stonks! Los puntos de {{name}} suben como la espuma.",
      "¡Añañin! {{name}} está intratable.",
      "¡Picante! Ese punto estuvo picante {{name}}.",
      "¡GG! {{name}} suma y sigue.",
      "¡Clean AF! Ese punto fue limpio, {{name}}."
    ]
  },
  POET: {
    WIN: [
      "¡Oh, glorioso destino que has tejido con hilos de oro este desenlace! {{name}}, cual héroe de epopeya antigua, se alza sobre el pedestal de la victoria. Sus trazos fueron versos, sus aciertos rimas, y su triunfo es el poema final que cierra esta velada. Las musas lloran de alegría y los dioses del Olimpo brindan con ambrosía en tu honor. ¡Salve, {{name}}, poeta del lápiz y conquistador de almas!",
      "En el lienzo silente de la batalla, solo una luz perdura: el resplandor de {{name}}. Ha navegado por mares tempestuosos de incertidumbre para arribar al puerto seguro del éxito. No es solo un juego lo que ha ganado, sino la inmortalidad del instante. Que los bardos canten sus hazañas y que el viento susurre su nombre en los valles eternos: {{name}}, el victorioso, el sublime, el eterno.",
      "Como el fénix renace de sus cenizas, así ha ascendido {{name}} hacia la cúpula celeste del triunfo. Cada punto fue una lágrima de esfuerzo, cada dibujo un suspiro del alma. Y ahora, coronado por el laurel de la gloria, {{name}} nos mira con la serenidad de quien ha tocado lo divino. ¡Oh, belleza inefable de la victoria! Hoy tienes el rostro y el nombre de {{name}}.",
      "El telón cae, pero el aplauso resuena en la eternidad. {{name}} ha escrito su nombre en el firmamento con tinta de estrellas. La tragedia de la derrota no le ha tocado, pues estaba predestinado a la comedia divina del éxito. Un brindis, compañeros, por el arte, por la vida y por {{name}}, quien hoy nos ha enseñado que la belleza y la victoria son una misma cosa.",
      "¿Escucháis eso? Es el universo conspirando en una sinfonía perfecta para celebrar a {{name}}. Las flores se abren a su paso y el sol detiene su carro para admirar su logro. Ha sido una danza de intelecto y pasión, un ballet de líneas y formas que ha culminado en este éxtasis. {{name}}, tu nombre quedará grabado en mármol en el templo de nuestra memoria.",
      "Bajo la bóveda celeste, un solo nombre resplandece con luz propia: {{name}}. Ha convertido el caos del papel en el cosmos del orden. Su victoria es un soneto perfecto, una oda a la perseverancia y al talento. Los ángeles del arte bajan sus cabezas en señal de respeto. ¡Oh, mortal divino! ¡Tu triunfo nos eleva a todos!",
      "Las parcas han cortado el hilo de la competencia, dejando solo la hebra dorada de {{name}} intacta. Es el destino manifiesto. Desde el principio de los tiempos, este momento estaba escrito en las estrellas. {{name}} no solo ha ganado, ha cumplido una profecía antigua. ¡Regocijaos, pues hemos sido testigos de la leyenda!",
      "Como Ulises regresando a Ítaca, {{name}} ha superado todas las pruebas y monstruos para reclamar su reino. Su arco fue el lápiz, sus flechas las ideas. Y ha dado en el blanco del triunfo con una precisión desgarradora. ¡Salve, rey/reina de la tinta! ¡Tu pueblo te aclama con lágrimas de emoción!",
      "La noche oscura del alma se disipa ante el amanecer radiante de {{name}}. Ha traído la luz de la victoria a este valle de sombras. Su éxito es un bálsamo para nuestros espíritus cansados. Bebed de la fuente de su genio y saciad vuestra sed de belleza. {{name}} es el manantial eterno.",
      "¡Oh, dulce néctar de la victoria! {{name}} embriaga nuestros sentidos con su triunfo. Es una melodía que resuena en lo más profundo del ser. Un canto a la alegría, un himno a la capacidad humana. {{name}}, has tocado las cuerdas de la eternidad y la música es sublime.",
      "Las rosas envidian el rubor de tu victoria, {{name}}. El mar envidia la profundidad de tu talento. La naturaleza entera palidece ante tu obra maestra. Has pintado el éxito con los colores del alma. Gracias por permitirnos contemplar tal maravilla. Eres el artista supremo de este juego.",
      "En el jardín de la vida, {{name}} es la flor más hermosa que ha brotado hoy. Su fragancia de triunfo impregna el aire. Ha resistido la tormenta y el granizo de la competencia para florecer con todo su esplendor. ¡Miradla/lo! ¡Admirad su belleza inmarcesible!",
      "El tiempo se detiene. Los relojes callan. Solo existe este instante perfecto donde {{name}} es coronado. Es un fragmento de eternidad capturado en un juego. Un diamante pulido por la presión. {{name}}, brillas más que mil soles. Tu luz nos ciega y nos guía.",
      "La poesía no está en las palabras, está en la victoria de {{name}}. Es un poema sin letras, escrito con gestos y triunfos. Una rima consonante con la gloria. ¡Bravo! ¡Bravo! Que los ecos de este aplauso resuenen hasta el fin de los días.",
      "Como Dante ascendiendo al Paraíso, {{name}} ha dejado atrás el Purgatorio de la duda y el Infierno del error. Ahora reside en la esfera de los bienaventurados, bañado en la luz de la victoria absoluta. ¡Oh, alma pura y victoriosa! ¡Guíanos con tu ejemplo!",
      "El cáliz del triunfo ha sido ofrecido y {{name}} lo ha bebido hasta las heces. Es un vino embriagador, reservado solo para los valientes. {{name}} ha demostrado su valor en el campo del honor. Su nombre será susurrado con reverencia por los siglos de los siglos.",
      "¡Silencio! La musa habla a través de {{name}}. Y su mensaje es claro: La victoria es belleza, y la belleza es verdad. {{name}} es el portador de esa verdad. Ha desvelado el misterio del juego y ha encontrado el tesoro oculto. ¡Loado sea!",
      "Las estrellas fugaces piden deseos a {{name}} hoy. Porque {{name}} es más brillante y más fugaz que ellas. Ha cruzado el firmamento de nuestra existencia dejando una estela de asombro. ¡Pide un deseo, campeón, que el universo te obedece!",
      "La tinta se ha secado, el papel descansa, pero la gloria de {{name}} vibra en el aire. Es una energía palpable, eléctrica. Ha transformado lo ordinario en extraordinario. Lo mundano en divino. ¡Gracias, {{name}}, por este milagro!",
      "Y así concluye el canto. La última estrofa pertenece a {{name}}. Un final perfecto para una obra maestra. El libro se cierra, pero la leyenda comienza. {{name}}, el inmortal. {{name}}, el victorioso. {{name}}, el poeta del juego."
    ],
    SCORE: [
      "Un trazo, un suspiro, un punto. {{name}} dibuja con el corazón.",
      "¡Qué bella metáfora visual! {{name}} suma un verso más a su historia.",
      "La inspiración divina ha tocado a {{name}}. Un punto merecido.",
      "Como una hoja al viento, {{name}} avanza suavemente hacia la gloria.",
      "El alma del artista se revela. {{name}} anota en el lienzo de la vida.",
      "Un destello de genio. {{name}} ilumina nuestra existencia con ese acierto.",
      "La belleza está en el ojo del que mira, y {{name}} ha creado belleza.",
      "Un paso más hacia el Olimpo. {{name}} escala la montaña del destino.",
      "¡Oh, fortuna! Has sonreído a {{name}} en este instante fugaz.",
      "El arte imita a la vida, y {{name}} imita a los dioses.",
      "Un punto, cual lágrima de alegría en el rostro de {{name}}.",
      "La sinfonía del juego continúa con una nota alta de {{name}}.",
      "Brillante cual lucero del alba. {{name}} acierta.",
      "La pluma es más fuerte que la espada, y {{name}} lo demuestra.",
      "Un susurro de genialidad recorre la sala. Es {{name}}.",
      "¡Oh, sublime acierto! {{name}} danza con las musas.",
      "El destino teje su hilo dorado a favor de {{name}}.",
      "Cada punto es un latido en el corazón de este juego. Bien, {{name}}.",
      "La armonía se restaura con ese punto de {{name}}.",
      "Poesía pura en movimiento. {{name}} avanza."
    ]
  }
};