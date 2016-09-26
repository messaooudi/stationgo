
let itineraireGramma = ['itinéraire', 'chemin', 'trajet'];
let stationGramma = ['station', 'stations'];
let procheGramma = ['proche'];
let costGramma = ['cher','chére','chere','chère'];
let prixGramma = ['prix', 'cout', 'coute'];
let gasoilGramma = ['gasoil'];
let essenceGramma = ['essence'];
let moinCherGramma = ['moin','moins'];
let plusGramma = ['plus'];


export function globaleGramma() {
    return {
        'showNearest': [procheGramma, itineraireGramma, stationGramma],
        'showCheapestGasoil': [costGramma, moinCherGramma, gasoilGramma, itineraireGramma, stationGramma],
        'showCheapestEssence': [costGramma, moinCherGramma, essenceGramma, itineraireGramma, stationGramma],
        'infoCheapestGasoil': [gasoilGramma, prixGramma, moinCherGramma],
        'infoCheapestEssence': [essenceGramma, prixGramma, moinCherGramma],
    };
}