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
            await this.actor.update({
                "system.updateSkillsMode": false,
                "system.updateGiftMode": false
            });
            sessionStorage.removeItem("launchFoundry");
        }
        console.log(this.data);
        return this.data;
    }

    activateListeners(html) {
        this.currentHtml = html;
        super.activateListeners(html);
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
        html.find(".yellow_card").click(async ev => {
            const attribute = ev.currentTarget.value
            await this.actor.update({
                [`${attribute}`]: true
            })
        })
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
        else{
            let gift = foundry.utils.deepClone(this.data.systemData.gift);
            gift[newKey] = {name: "", psy: 0, dice_quantity: 0, dice_type: "d?", bonus: 0};
            this.actor.update({
                "system.gift": gift
            })
        }
    }

    async close(options = {}){
        this.actor.update({
            "system.updateSkillsMode": false,
            "system.updateGiftMode": false
        });
        return super.close(options);
    }
}

