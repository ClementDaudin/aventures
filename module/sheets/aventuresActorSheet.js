export default class aventuresActorSheet extends ActorSheet {

    constructor(...args) {
        super(...args);
        this.data = null;
        this.currentHtml = null;
    }

    get template() {
        console.log(`aventures | Récupération du fichier html ${this.actor.type}-sheet.`);
        return `systems/aventures/templates/sheets/${this.actor.type}-sheet.html`;
    }

    async getData(options) {
        this.data = await super.getData(options);
        this.data.systemData = this.data.data.system;
        this.data.descriptionHTML = await TextEditor.enrichHTML(this.data.systemData.biography, {
            secrets: this.document.isOwner,
            async: true
        });
        if(sessionStorage.getItem("launchFoundry")){
            this.data.systemData.updateSkillsMode = false;
            this.data.systemData.updateGiftMode = false;
            this.data.systemData.updateGeneralEquipmentMode = false;
            this.data.systemData.updateArmorMode = false;
            await this.actor.update({
                "system.updateSkillsMode": false,
                "system.updateGiftMode": false,
                "system.updateGeneralEquipmentMode": false,
                "system.updateArmorMode": false
            });
            sessionStorage.removeItem("launchFoundry");
        }
        console.log(this.data);
        return this.data;
    }

    activateListeners(html) {
        this.currentHtml = html;
        super.activateListeners(html);
        if (localStorage.getItem('page') === "skills") {
            html.find("#skills_component")[0].style.display = "block";
            html.find("#module_component")[0].style.display = "block";
            html.find("#equipment_component")[0].style.display = "none";
       }else if (localStorage.getItem('page') === "equipment") {
            html.find("#skills_component")[0].style.display = "none";
            html.find("#module_component")[0].style.display = "none";
            html.find("#equipment_component")[0].style.display = "block";
            localStorage.setItem('page', 'equipment');
        }
            /*html.find("#main-radio")[0].addEventListener('click', () => {
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
            }*/

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
                "system.updateArmorMode": false
            });

            const actionName = ev.currentTarget.getAttribute("name"); // ex: "act_skills" ou "act_equipment"

            // Choisis la div où ajouter le hidden selon l'action
            if (actionName === "act_skills") {
                html.find("#skills_component")[0].style.display = "block";
                html.find("#module_component")[0].style.display = "block";
                html.find("#equipment_component")[0].style.display = "none";
                localStorage.setItem('page', 'skills');

            } else if (actionName === "act_equipment") {
                html.find("#skills_component")[0].style.display = "none";
                html.find("#module_component")[0].style.display = "none";
                html.find("#equipment_component")[0].style.display = "block";
                localStorage.setItem('page', 'equipment');
            }
        });

        html.find(".roll-dice").click(ev => {
            const diceToRoll = ev.currentTarget.dataset.dice;
            const diceStat = ev.currentTarget.dataset.roll;
            const diceType = ev.currentTarget.dataset.title;
            this.rollDice(diceToRoll, diceStat, diceType);
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
    }

    async close(options = {}){
        this.actor.update({
            "system.updateSkillsMode": false,
            "system.updateGiftMode": false,
            "system.updateGeneralEquipmentMode": false,
            "system.updateArmorMode": false
        });
        return super.close(options);
    }


    async _updateObject(event, formData) {
        console.log("Submitting form data", formData);
        await this.actor.update(formData);
    }

    async rollDice(diceToRoll, diceStat, diceType) {
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
                        diceStat = Math.min( Number(diceStat) + modifier, 95);
                        let max=100;

                        if(hideDieSelect){
                            const die = html.find('[name="die"]').val();
                            formula = `1d${die}`;
                            max = die;
                        }

                        const roll = new Roll(formula);
                        roll.roll({async: true}).then(r => {
                            let result = roll.total;
                            const seuilVert = Math.max(1/max, Math.ceil(0.05 * max))
                            const seuilRouge = Math.min(max, 95)
                            const rightOffset = diceStat < 10 ? "18px" : "12px";
                            const playerColor = game.user.color;
                            console.log(playerColor)
                            let color = "#3e2d17";
                            if (result <= seuilVert) {
                                color = "green";
                            } else if (result >= seuilRouge) {
                                color = "red";
                            }
                            const tokenImg = this.actor.token?.texture?.src ?? this.actor.img ?? "icons/svg/mystery-man.svg";
                            const messageContent =
                                          `<div style="
                                              font-family: 'Obra Letra', sans-serif;
                                              text-align: center;
                                              color: #3e2d17;
                                              position: relative;
                                              user-select: none;
                                              height: 170px;
                                           ">
                                                <img src="/systems/aventures/assets/roll-card-aventure.png" 
                                                    style="
                                                        position: absolute;
                                                        top: 0;
                                                        left: 0;
                                                        width: 100%;
                                                        height: 100%;
                                                        image-rendering: crisp-edges;
                                                        z-index: 0;
                                                        pointer-events: none;
                                              " />
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
                                             <div style="position: relative; z-index: 1; padding-top: 8px;">
                                                <div style="font-weight: 600; font-size: 1.5em; margin-bottom: 10px; letter-spacing: 0.05em">
                                                  Jet de <br/>${diceType}
                                                </div>
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
                                                </div>
                                             </div>
                                        </div>`;
                            AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
                            ChatMessage.create({
                                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                                content: messageContent,
                            });
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
}

