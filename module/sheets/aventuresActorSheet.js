export default class aventuresActorSheet extends ActorSheet {

    constructor(...args) {
        super(...args);
        this.data = null;
        this.currentHtml = null;
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 830,
            resizable: true
        });
    }

    get template() {
        console.log(`aventures | Récupération du fichier html ${this.actor.type}-sheet.`);
        return `systems/aventures/templates/sheets/${this.actor.type}-sheet.html`;
    }

    async getData(options) {
        this.data = await super.getData(options);
        this.data.systemData = this.data.data.system;
        this.data.notesHTML = await TextEditor.enrichHTML(this.data.systemData.notes, {
            secrets: this.document.isOwner,
            async: true
        });
        if(sessionStorage.getItem("launchFoundry")){
            this.data.systemData.updateSkillsMode = false;
            this.data.systemData.updateGiftMode = false;
            this.data.systemData.updateGeneralEquipmentMode = false;
            this.data.systemData.updateArmorMode = false;
            this.data.systemData.updateWeaponsMode = false;
            await this.actor.update({
                "system.updateSkillsMode": false,
                "system.updateGiftMode": false,
                "system.updateGeneralEquipmentMode": false,
                "system.updateArmorMode": false,
                "system.updateWeaponsMode": false
            });
            sessionStorage.removeItem("launchFoundry");
        }
        this.data.weapons = this.actor.items.filter(i => i.type === "Arme");
        const currentFolderId = game.settings.get("aventures", "folderId")
        const folder = game.folders.get(currentFolderId);
        this.data.adventureDiceSetting = folder?.getFlag("aventures", "adventureDice") || 0;
        this.data.misadventureDiceSetting = folder?.getFlag("aventures", "misadventureDice") || 0;


        console.log(this.data);
        return this.data;
    }

    activateListeners(html) {
        this.currentHtml = html;
        super.activateListeners(html);

        this._onSettingChange = (settingName, value) => {
            if (settingName.key === "aventures.misadventureDice") {
                this.render();
            }
        };

        Hooks.on("updateSetting", this._onSettingChange);

        const el = html[0].closest(".app");

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                el.classList.toggle("not_compact", width > 1000);
            }
        });

        observer.observe(el);

        if (localStorage.getItem('inventory') === "skills") {
            html.find("#skills_component")[0].style.display = "block";
            html.find("#notes_component")[0].style.display = "block";
            html.find("#equipment_component")[0].style.display = "none";
       }else if (localStorage.getItem('inventory') === "equipment") {
            html.find("#skills_component")[0].style.display = "none";
            html.find("#notes_component")[0].style.display = "none";
            html.find("#equipment_component")[0].style.display = "block";
            localStorage.setItem('inventory', 'equipment');
        }
        html.find("#main-radio")[0].addEventListener('click', () => {
            html.find("#main")[0].style.display = "block";
            html.find("#presentation")[0].style.display = "none";
            localStorage.setItem('page', 'main')
        })
        html.find("#presentation-radio")[0].addEventListener('click', () => {
            html.find("#main")[0].style.display = "none";
            html.find("#presentation")[0].style.display = "flex";
            localStorage.setItem('page', 'presentation')
        })
        if(!this.actor.isOwner){
            localStorage.setItem('page', 'presentation');
        }

        switch (localStorage.getItem('page')) {
            case "main":
                html.find("#main")[0].style.display = "block";
                html.find("#presentation")[0].style.display = "none";
                html.find("#main-radio")[0].checked = true;
                break;
            default:
                html.find("#presentation")[0].style.display = "flex";
                html.find("#main")[0].style.display = "none";
                html.find("#presentation")[0].checked = true;
                break;
            }

        html.find(".switchModeButton").click(async ev => {
            const value = ev.currentTarget.dataset.value;
            const parameter = ev.currentTarget.dataset.parameter;
            await this.actor.update({
                [`system.${parameter}`]: value === "true"
            });
            this.render();
        })

        html.find(".add-button").click(async ev => {
            this.addToList(ev.currentTarget.dataset.key);
        });

        html.find(".item-delete").click(async ev => {
            const key = ev.currentTarget.dataset.key;
            const parameter = ev.currentTarget.dataset.parameter;
            if(parameter === "weapon"){

                await this.actor.deleteEmbeddedDocuments("Item", [key]);
                return;
            }
            await this.actor.update({
                [`system.${parameter}.-=${key}`]: null
            });
            this.render();
        })
        html.find('input[type="checkbox"]').click(async ev => {
            const attribute = ev.currentTarget.value
            await this.actor.update({
                [`${attribute}`]: true
            })
        })

        html.find(".tablinks").click(ev => {
            ev.preventDefault();
            this.actor.update({
                "system.updateSkillsMode": false,
                "system.updateGiftMode": false,
                "system.updateGeneralEquipmentMode": false,
                "system.updateArmorMode": false,
                "system.updateWeaponsMode": false
            });

            const actionName = ev.currentTarget.getAttribute("name"); // ex: "act_skills" ou "act_equipment"

            // Choisis la div où ajouter le hidden selon l'action
            if (actionName === "act_skills") {
                html.find("#skills_component")[0].style.display = "block";
                html.find("#notes_component")[0].style.display = "block";
                html.find("#equipment_component")[0].style.display = "none";
                localStorage.setItem('inventory', 'skills');

            } else if (actionName === "act_equipment") {
                html.find("#skills_component")[0].style.display = "none";
                html.find("#notes_component")[0].style.display = "none";
                html.find("#equipment_component")[0].style.display = "block";
                localStorage.setItem('inventory', 'equipment');
            }
        });

        html.find(".roll-dice").click(ev => {
            const formula = ev.currentTarget.dataset.dice;
            const rollCategory = ev.currentTarget.dataset.type;
            const diceTitle = ev.currentTarget.dataset.title;

            if(rollCategory === "weapons"){
                const weaponType = ev.currentTarget.dataset.damagetype;
                const roll = new Roll(formula);
                const match = formula.match(/^(\d+)[dD](\d+)(?:\+(\d+))?$/);
                const max = parseInt(match[1]) * parseInt(match[2]) + parseInt(match[3] ?? "0");
                const min = parseInt(match[1]) + parseInt(match[3] ?? "0");
                this.generateRollMessage({
                    roll,
                    diceTitle: diceTitle,
                    weaponType: weaponType,
                    isDamage: true,
                    min: min,
                    max: max
                });
                return;
            }
            if(rollCategory === "gift"){
                const match = formula.match(/^(\d+)[dD](\d+)(?:\+(\d+))?$/);
                const max = parseInt(match[1]) * parseInt(match[2]) + parseInt(match[3] ?? null);
                const min = parseInt(match[1]) + parseInt(match[3] ?? null);
                this.rollDice({ diceToRoll: formula, diceTitle: diceTitle, isDamage: true, min: min, max: max });
                return;
            }
            const diceStat = ev.currentTarget.dataset.roll;
            this.rollDice({diceToRoll: formula, diceStat: diceStat, diceTitle: diceTitle});
        });

        html.find(".updateBonus").click(async ev => {
            const checked = ev.currentTarget.checked;
            const attribute = ev.currentTarget.dataset.attribute;
            const token = this.actor.getActiveTokens()[0];
            await token.toggleEffect(`systems/aventures/assets/icons/${attribute}.png`, { active: checked });

        })

        html.find("#posture").change(async ev => {
            const selected = ev.currentTarget.value;
            const token = this.actor.getActiveTokens()[0];
            await token.toggleEffect(`systems/aventures/assets/icons/defensif.png`, { active: false });
            await token.toggleEffect(`systems/aventures/assets/icons/offensif.png`, { active: false });
            await token.toggleEffect(`systems/aventures/assets/icons/focus.png`, { active: false });
            if(selected !== "aucune"){
                await token.toggleEffect(`systems/aventures/assets/icons/${selected}.png`, { active: true });
            }
        })
        html.find("#hp").change(async ev => {
            const token = this.actor.getActiveTokens()[0];
            if ( ev.currentTarget.value <= 0) {
                await token.document.update({tint: "#3a3939"});
                await token.toggleEffect(`icons/svg/skull.svg`, {active: true});
            }else{
                await token.document.update({tint: null});
                await token.toggleEffect(`icons/svg/skull.svg`, {active: false});
            }
        });

        const saveField = async (el, path, isNumber = false) => {
            const itemId = el.data("itemId");
            const item = this.actor.items.get(itemId);
            if (!item) return;

            const value = isNumber ? Number(el.val()) : el.val();
            await item.update({ [path]: value });
        };

        html.find(".weapon-name").on("change", async ev => {
            await saveField($(ev.currentTarget), "name");
        });

        // Type
        html.find(".weapon-type").on("change", async ev => {
            await saveField($(ev.currentTarget), "system.type");
        });

        // Dice quantity
        html.find(".weapon-dice_quantity").on("change", async ev => {
            await saveField($(ev.currentTarget), "system.dice_quantity", true);
        });

        // Dice number
        html.find(".weapon-dice_number").on("change", async ev => {
            await saveField($(ev.currentTarget), "system.dice_number");
        });

        // Bonus
        html.find(".weapon-bonus").on("change", async ev => {
            await saveField($(ev.currentTarget), "system.bonus", true);
        });
    }

    addToList(type) {
        const newKey = randomID();
        if (type === "skill") {
            let skills = foundry.utils.deepClone(this.data.systemData.skills);
            skills[newKey] = {
                name: "",
                skill: "Aucun",
                bonus: 0
            };
            this.actor.update({
                "system.skills": skills
            });
        }
        else if (type === "gift"){
            let gift = foundry.utils.deepClone(this.data.systemData.gift);
            gift[newKey] = {name: "", psy: 0, dice_quantity: 0, dice_type: "d?", bonus: 0};
            this.actor.update({
                "system.gift": gift
            })
        }
        else if (type === "equipment"){
            let equipment = foundry.utils.deepClone(this.data.systemData.equipment.general);
            equipment[newKey] = {name: "", quantity: 0};
            this.actor.update({
                "system.equipment.general": equipment
            })
        }
        else if (type === "armor"){
            let armor = foundry.utils.deepClone(this.data.systemData.equipment.armor);
            armor[newKey] = {name: "", value: 0};
            this.actor.update({
                "system.equipment.armor": armor
            })
        }
        else if (type === "weapon"){
            const newWeapon = {
                name: "Nom",
                type: "Arme",
                system: {
                    description: "",
                    type: "Aucun",
                    dice_number: "d?"
                }
            }
            this.actor.createEmbeddedDocuments("Item", [newWeapon]);
        }
    }

    async close(options = {}){
        this.actor.update({
            "system.updateSkillsMode": false,
            "system.updateGiftMode": false,
            "system.updateGeneralEquipmentMode": false,
            "system.updateArmorMode": false,
            "system.updateWeaponsMode": false
        });
        return super.close(options);
    }

    async _updateObject(event, formData) {
        await this.actor.update(formData);
    }

    async rollDice({diceToRoll, diceStat = null, diceTitle, isDamage = false, min = null,  max = null}) {
        const hideDieSelect = diceToRoll === "1d?";

        new Dialog({
            title: "Jet personnalisé",
            content: `
      <form>
        <div class="form-group" style="${hideDieSelect ? '' : 'display:none;'}">
          <label for="die">Type de dé</label>
          <select id="die" name="die">
            <option value="6" selected>d6</option>
            <option value="8">d8</option>
            <option value="10">d10</option>
            <option value="12">d12</option>
            <option value="20">d20</option>
          </select>
        </div>
        <div class="form-group" style="${hideDieSelect ? 'display:none;' : ''}">
          <label for="modifier">Bonus / Malus</label>
          <input type="number" id="modifier" name="modifier" value="0"/>
        </div>
      </form>
    `,
            buttons: {
                roll: {
                    label: "Lancer",
                    callback: html => {
                        let formula = diceToRoll;
                        const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
                        if(isDamage){
                            formula+=`+${modifier}`;
                        }
                        else{
                            diceStat = Math.min( Number(diceStat) + modifier, 95);
                        }
                        max = isDamage ? max + modifier : 100;
                        min = isDamage ? min + modifier : null;

                        if(hideDieSelect){
                            const die = html.find('[name="die"]').val();
                            formula = `1d${die}`;
                            max = die;
                        }

                        const roll = new Roll(formula);
                        this.generateRollMessage({
                            roll,
                            diceTitle: diceTitle,
                            diceStat: diceStat,
                            min: min,
                            max: max,
                            isDamage: isDamage,
                        });
                    }
                },
                cancel: {
                    label: "Annuler"
                }
            },
            default: "roll"
        }).render(true);
    }

    generateRollMessage({ roll, diceTitle, diceStat = null, min = null, max = null, weaponType = null, isDamage = false}) {
        roll.roll({ async: true }).then(r => {
            const result = r.total;
            const playerColor = game.user.color;
            const tokenImg = this.actor.token?.texture?.src ?? this.actor.img ?? "icons/svg/mystery-man.svg";

            let color = "#3e2d17";
            let rightOffset = diceStat < 10 ? "18px" : "12px";
            if (!isDamage && max !== null) {
                const seuilVert = Math.max(1 / max, Math.ceil(0.05 * max));
                const seuilRouge = Math.min(max, 95);
                if (result <= seuilVert) color = "green";
                else if (result >= seuilRouge) color = "red";
            }else{
                if (result <= min) color = "red";
                else if (result >= max) color = "green";
            }

            // Choix de l'image de fond
            const backgroundImage = isDamage
                ? "/systems/aventures/assets/roll-damage.png"
                : "/systems/aventures/assets/roll-card-aventure.png";

            // Partie haute
            const titleBlock = isDamage
                ? (weaponType
                        ? `
        <div style="font-weight: 700; font-size: 2.2em; margin-bottom: 4px; word-break: break-word; white-space: normal;">
            ${diceTitle}
            <div style="font-weight: 400; font-size: 0.9em;">
                (${weaponType})
            </div>
        </div>`
                        : `
        <div style="font-weight: 700; font-size: 2.0em; margin: 4px 35px; word-break: break-word; white-space: normal;">
  ${diceTitle}
</div>`
                )
                : `
    <div style="font-weight: 600; font-size: 1.5em; margin-bottom: 10px; letter-spacing: 0.05em">
        Jet de <br/>${diceTitle}
    </div>`;

            // Partie basse :
            const infoBlock = isDamage
                ? `
    <div style="font-size: 4em; font-weight: 900; letter-spacing: 0.15em; color: ${color};">
      ${result}
    </div>`
                : `
                    <div style="font-size: 4em; font-weight: 900; letter-spacing: 0.15em; color: ${color};">
                      ${result}
                    </div>
                    <div style="
                      position: absolute;
                      top: 115px;
                      right: ${rightOffset};
                      font-size: 25px;
                      z-index: 2;
                      color: #e6dab9;
                    ">
                      ${diceStat}
                    </div>`;

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
                <div style="
                    position: absolute;
                    top: 2px;
                    right: 10px;
                    width: 25px;
                    height: 39px;
                    background-color: ${playerColor};
                    clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                "></div>
                <img src="${tokenImg}" style="
                    position: absolute;
                    top: 4px;
                    right: 10px;
                    width: 25px;
                    height: 25px;
                    object-fit: cover;
                    z-index: 2;
                ">
                <div style="position: relative; z-index: 1; padding-top: 10px;">
                    ${titleBlock}
                    ${infoBlock}
                </div>
            </div>
        `;

            AudioHelper.play({ src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false }, true);

            ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                content: messageContent,
            });
        });
    }

}

