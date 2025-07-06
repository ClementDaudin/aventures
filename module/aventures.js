import aventuresActorSheet from "./sheets/aventuresActorSheet.js";
import aventuresItemSheet from "./sheets/aventuresItemSheet.js";

let scrollPosition = 0;
Hooks.once("init", () => {
    console.log("aventures | Initialisation du système");

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("aventures", aventuresItemSheet, {makeDefault: true});

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("aventures", aventuresActorSheet, {makeDefault: true});

    sessionStorage.setItem("launchFoundry", "true");

})
// Restaurer la position de défilement avec un délai
Hooks.on('updateActor', (actor, updateData, options, userId) => {
    /*const sheet = game.actors.get(actor.id)?.sheet;
    const html = sheet.currentHtml;
    scrollPosition = html[0].scrollTop;
    localStorage.setItem("scroll", "0");*/

});
Hooks.on('renderActorSheet', (sheet, html, data) => {
   /* if(localStorage.getItem("scroll") !=="0"){
        scrollPosition = parseFloat(localStorage.getItem("scroll"));
    }
    html[0].scrollTop = scrollPosition;
    localStorage.setItem("scroll", "0");*/
});

Hooks.on("ready", async () => {
});

Hooks.on("createItem", async (item, itemData) => {
   /* if(item._stats.lastModifiedBy === game.users.current._id) {
        if (item.parent !== null) {
            const actor = game.actors.get(item.parent._id);
            console.log(`Un item est sur le point d'être ajouté à l'acteur ${actor.name}:`, item);
        }
        return true;
    }*/
});

Handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
});

Handlebars.registerHelper('lookup', function (obj, field) {
    console.log(obj, field);
    return obj?.[field];
});
