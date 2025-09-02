import aventuresActorSheet from "./sheets/aventuresActorSheet.js";
import aventuresItemSheet from "./sheets/aventuresItemSheet.js";

Hooks.once("init", () => {
    console.log("aventures | Initialisation du système");

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("aventures", aventuresItemSheet, {makeDefault: true});

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("aventures", aventuresActorSheet, {makeDefault: true});

    sessionStorage.setItem("launchFoundry", "true");

    CONFIG.statusEffects.push(
        {
            id: "advantage",
            label: "Avantage",
            icon: "systems/aventures/assets/icons/advantage.png",
            flags: { core: { statusId: "advantage" } }
        },
        {
            id: "disadvantage",
            label: "Désavantage",
            icon: "systems/aventures/assets/icons/disadvantage.png",
            flags: { core: { statusId: "disadvantage" } }
        },
        {
            id: "focus",
            label: "focus",
            icon: "systems/aventures/assets/icons/focus.png",
            flags: { core: { statusId: "focus" } }
        },
        {
            id: "offensif",
            label: "Offensif",
            icon: "systems/aventures/assets/icons/offensif.png",
            flags: { core: { statusId: "offensif" } }
        },
        {
            id: "defensif",
            label: "Défensif",
            icon: "systems/aventures/assets/icons/defensif.png",
            flags: { core: { statusId: "defensif" } }
        }
    );

    game.settings.register("aventures", "folderId", {
        name: "Identifiant du groupe",
        scope: "world",
        config: false,
        type: String,
        default: "",
        onChange: value => {
            const folder = game.folders.get(value);
            const adventureRoll = document.getElementById("adventure-roll");
            const misadventureRoll = document.getElementById("misadventure-roll");
            if(!folder){return}
            if(!folder.getFlag("aventures", "adventureDice") && !folder.getFlag("aventures", "misadventureDice")){
                folder.setFlag("aventures", "adventureDice", 2);
                folder.setFlag("aventures", "misadventureDice", 2);
                document.getElementById("adventure-count").textContent = 2;
                document.getElementById("misadventure-count").textContent = 2;
                adventureRoll.disabled = false;
                misadventureRoll.disabled = false;
            }else{

                let adventureDice = folder.getFlag("aventures", "adventureDice")
                let misadventureDice = folder.getFlag("aventures", "misadventureDice")
                adventureRoll.disabled = (adventureDice <= 0);
                misadventureRoll.disabled = (misadventureDice <= 0);

                document.getElementById("adventure-count").textContent = adventureDice;
                document.getElementById("misadventure-count").textContent = misadventureDice;
            }
        }
    });
})

let socket;

async function sendAdventureRoll(isAdventure) {
    const folderId = game.settings.get("aventures", "folderId");
    const folder = game.folders.get(folderId);
    if (!folder) return ui.notifications.warn("Folder not found");

    let adventureDice = await folder.getFlag("aventures", "adventureDice");
    let misadventureDice = await folder.getFlag("aventures", "misadventureDice");

    rollAdventureDice(adventureDice, misadventureDice, isAdventure);
}
Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerSystem("aventures");
    socket.register("sendAdventureRoll", sendAdventureRoll);
});
Hooks.on("ready", async () => {
    if (document.getElementById("aventures-roller")) return;

    const btn = document.createElement("div");
    let currentFolderId = game.settings.get("aventures", "folderId");
    if(!game.folders.get(currentFolderId)){
        const folders = game.folders.filter(f => f.type === "Actor");
        currentFolderId = folders[0]?.id;
        game.settings.set("aventures", "folderId", currentFolderId);
    }
    const folder = game.folders.get(currentFolderId);
    let adventureDice = folder?.getFlag("aventures", "adventureDice");
    let misadventureDice =folder?.getFlag("aventures", "misadventureDice");
    btn.id = "aventures-roller";
    let folderSelect = "";
    if (game.user.isGM) {
        const folders = game.folders.filter(f => f.type === "Actor");
        const savedFolderId = game.settings.get("aventures", "folderId") || folders[0]?.id;

        folderSelect = `
         <div class="adventure-select-wrapper">
          <select id="aventures-folder">
            ${folders.map(f => `
              <option value="${f.id}" ${f.id === savedFolderId ? "selected" : ""}>
                Équipe : ${f.name}
              </option>
            `).join("")}
          </select>
        </div>

        `;
    }
    btn.innerHTML = `
        ${folderSelect}
        <button id="adventure-roll" class="adventure-button" ${adventureDice === 0 ? "disabled" : ""}>
          Dés d'Aventure (<span id="adventure-count">${adventureDice}</span>)
        </button>
        
        <button id="misadventure-roll" class="misadventure-button" ${misadventureDice === 0 ? "disabled" : ""}>
          Dés de Mésaventure (<span id="misadventure-count">${misadventureDice}</span>)
        </button>
  `;
    document.body.appendChild(btn);

    if (game.user.isGM){
        const select = document.getElementById("aventures-folder");
        select.addEventListener("change", async ev => {
            await game.settings.set("aventures", "folderId", ev.target.value);
        });
    }

    document.getElementById("adventure-roll").addEventListener("click", () => {
        socket.executeAsGM("sendAdventureRoll", true);

    });
    document.getElementById("misadventure-roll").addEventListener("click", () => {
        socket.executeAsGM("sendAdventureRoll", false);
    });
});


Hooks.on("createToken", async (tokenDoc, options, userId) => {
    const token = tokenDoc.object;
    if (token.actor.data.data.dice.advantage) {
        await token.toggleEffect("systems/aventures/assets/icons/advantage.png", { active: true });

    }
    if (token.actor.data.data.dice.disadvantage) {
        await token.toggleEffect("systems/aventures/assets/icons/disadvantage.png", { active: true });
    }
    const posture = token.actor.data.data.basic_posture;
    if (posture !== "aucune") {
        await token.toggleEffect(`systems/aventures/assets/icons/${posture}.png`, { active: true });
    }

    if(token.actor.data.data.hp.value<=0){
        await token.document.update({ tint: "#3a3939" });
        await token.toggleEffect(`icons/svg/skull.svg`, { active: true });
    }
});

Hooks.on("createFolder", (folder, options, userId) => {

    if(folder.type !== "Actor"){
        return;
    }
    if(!game.settings.get("aventures", "folderId")){
        console.log("NO SETTINGS")
        game.settings.set("aventures", "folderId", folder.id);
    }

    const select = document.getElementById("aventures-folder");
    if (!select) return;

    // Crée un nouvel élément <option>
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = `Équipe : ${folder.name}`;

    // L'ajoute au <select>
    select.appendChild(option);

})

Hooks.on("updateFolder", (folder, changes, options, userId) => {
    if (folder.id !== game.settings.get("aventures", "folderId")) return;
    const adventureRoll = document.getElementById("adventure-roll");
    const misadventureRoll = document.getElementById("misadventure-roll");
    let adventureDice = folder.getFlag("aventures", "adventureDice")
    let misadventureDice = folder.getFlag("aventures", "misadventureDice")
    adventureRoll.disabled = (adventureDice <= 0);
    misadventureRoll.disabled = (misadventureDice <= 0);

    document.getElementById("adventure-count").textContent = adventureDice;
    document.getElementById("misadventure-count").textContent = misadventureDice;
    for (let appId in ui.windows) {
        const app = ui.windows[appId];
        if (app.actor?.type === "Aventurier") {
            app.render(false);
        }
    }
});
Hooks.on("deleteFolder", (folder, options, userId) => {
    if (folder.type !== "Actor") return;

    // Trouve le <select> par son ID
    const select = document.getElementById("aventures-folder");
    if (!select) return;

    // Trouve l’option correspondante dans le <select>
    const optionToRemove = select.querySelector(`option[value="${folder.id}"]`);
    if (optionToRemove) {
        optionToRemove.remove();
    }
});
Hooks.on("updateSetting", (setting) => {
    if (setting.key !== "aventures.folderId") return;

    for (let appId in ui.windows) {
        const app = ui.windows[appId];
        if (app.actor?.type === "Aventurier") {
            app.render(false);
        }
    }
});

Handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
});

Handlebars.registerHelper('lookup', function (obj, field) {
    return obj?.[field];
});

function rollAdventureDice(adventureDice, misadventureDice, isAdventure) {
    if(isAdventure){
        adventureDice--;
        misadventureDice++;
    }else{
        adventureDice++;
        misadventureDice--;
    }
    const folderId = game.settings.get("aventures", "folderId")
    const folder = game.folders.get(folderId)
    folder.setFlag("aventures", "adventureDice", adventureDice);
    folder.setFlag("aventures", "misadventureDice", misadventureDice);
    updateShownDice(adventureDice, misadventureDice);
    rollAdventure(isAdventure);
}

function updateShownDice(adventureDice, misadventureDice) {
    const adventureRoll = document.getElementById("adventure-roll");
    const misadventureRoll = document.getElementById("misadventure-roll");
    adventureRoll.disabled = (adventureDice <= 0);
    misadventureRoll.disabled = (misadventureDice <= 0);
    document.getElementById("adventure-count").textContent = adventureDice;
    document.getElementById("misadventure-count").textContent = misadventureDice;
}

function rollAdventure(isAdventure) {
    const roll = new Roll("1d6");
    roll.roll({ async: true }).then(r => {
        const result = r.total;
        let color = "#3e2d17";
        const adventureIndex = Math.ceil(result / 2);
        let adventureClass = "mésaventure";

        if (isAdventure) {
            adventureClass = "aventure";
        } else {
            adventureClass = "mésaventure";
        }
        const backgroundImage = "/systems/aventures/assets/roll-damage.png"
        const messageContent = `
            <div style="
                font-family: 'Obra Letra', sans-serif;
                text-align: center;
                color: #3e2d17;
                position: relative;
                user-select: none;
                height: 170px;
            ">
                <img src="${backgroundImage}" 
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            image-rendering: crisp-edges; z-index: 0; pointer-events: none;" />
                <div style="position: relative; z-index: 1; padding-top: 10px;">
                    <div style="font-weight: 700; font-size: 1.4em; margin: 4px 35px; word-break: break-word; white-space: normal;">
                        Dés ${isAdventure ? "d'aventure" : "de mésaventure"}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-family: 'Obra Letra', sans-serif; font-size: 1.2em; margin-top: 8px;">
                      <div>Jet</div><div class="adventure-result">${result}</div>
                      <div>1-2</div><div class="adventure-result ${adventureIndex === 1 ? adventureClass : ''}">Déplacement</div>
                      <div>3-4</div><div class="adventure-result ${adventureIndex === 2 ? adventureClass : ''}">Posture</div>
                      <div>5-6</div><div class="adventure-result ${adventureIndex === 3 ? adventureClass : ''}">In extremis</div>
                    </div>
                </div>
            </div>
        `;

        AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({actor: "TOI"}),
            content: messageContent,
        });
    });
}

