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
    }
}
