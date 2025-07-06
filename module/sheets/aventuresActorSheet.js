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
        diceStat = Math.min(diceStat, 95);
        let roll = new Roll(diceToRoll);
        await roll.evaluate();
        let result = roll.total;
        let messageContent = `<div>${this.actor.name} effectue un jet de ${diceType} ! ${result} vs ${diceStat}</div>`;
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            content: messageContent,
        });
    }

}

