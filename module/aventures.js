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

    game.settings.register("aventures", "adventureDice", {
        name: "Dés d'Aventure",
        scope: "world",
        config: false,
        type: Number,
        default: 2,
        onChange: value => {
            const adventureRoll = document.getElementById("adventure-roll");
            const misadventureRoll = document.getElementById("misadventure-roll");
            adventureRoll.disabled = (value <= 0);
            misadventureRoll.disabled = (value >= 4);
            document.getElementById("adventure-count").textContent = value;
            document.getElementById("misadventure-count").textContent = 4-value;
        }
    });

    game.settings.register("aventures", "misadventureDice", {
        name: "Dés de mésaventure",
        scope: "world",
        config: false,
        type: Number,
        default: 2,
        onChange: value => {
            const adventureRoll = document.getElementById("adventure-roll");
            const misadventureRoll = document.getElementById("misadventure-roll");
            adventureRoll.disabled =(value >= 4);
            misadventureRoll.disabled = (value <= 0);

            document.getElementById("adventure-count").textContent = 4-value;
            document.getElementById("misadventure-count").textContent = value;
        }
    });

})

Hooks.on("ready", async () => {
    game.socket.on("system.aventures", (data) => {
        if (!game.user.isGM) return;

        if (data.action === "updateDice") {
            let adventureDice = game.settings.get("aventures", "adventureDice");
            let misadventureDice = game.settings.get("aventures", "misadventureDice") || 0;

            rollAdventureDice(adventureDice, misadventureDice, data.isAdventure);
        }
    });

    if (document.getElementById("aventures-roller")) return;

    const btn = document.createElement("div");
    let adventureDice = game.settings.get("aventures", "adventureDice") || 0;
    let misadventureDice = game.settings.get("aventures", "misadventureDice") || 0;
    btn.id = "aventures-roller";
    btn.innerHTML = `
        <button id="adventure-roll" class="adventure-button" ${adventureDice === 0 ? "disabled" : ""}>
          Dés d'Aventure (<span id="adventure-count">${adventureDice}</span>)
        </button>
        
        <button id="misadventure-roll" class="misadventure-button" ${misadventureDice === 0 ? "disabled" : ""}>
          Dés de Mésaventure (<span id="misadventure-count">${misadventureDice}</span>)
        </button>
  `;
    document.body.appendChild(btn);
    document.getElementById("adventure-roll").addEventListener("click", () => {
        if (!game.user.isGM){
            game.socket.emit("system.aventures", { action: "updateDice", isAdventure: true });
            return;
        }
        adventureDice = game.settings.get("aventures", "adventureDice") || 0;
        misadventureDice = game.settings.get("aventures", "misadventureDice") || 0
        rollAdventureDice(adventureDice, misadventureDice, true);

    });
    document.getElementById("misadventure-roll").addEventListener("click", () => {
        adventureDice = game.settings.get("aventures", "adventureDice") || 0;
        misadventureDice = game.settings.get("aventures", "misadventureDice") || 0
        if (!game.user.isGM){
            game.socket.emit("system.aventures", { action: "updateDice", isAdventure: false });
            return;
        }
        rollAdventureDice(adventureDice, misadventureDice, false);
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
    game.settings.set("aventures", "adventureDice", adventureDice);
    game.settings.set("aventures", "misadventureDice", misadventureDice);
    rollAdventure(isAdventure);
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

