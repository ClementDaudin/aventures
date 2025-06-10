export default class aventuresItemSheet extends ItemSheet{
    get template(){
        console.log(`aventures | Récupération du fichier html ${this.item.type}-sheet.`);

        return `systems/aventures/templates/sheets/${this.item.type}-sheet.html`;
    }

    async getData(options){
        const data = await super.getData(options);
        data.systemData = data.data.system;
        data.descriptionHTML = await TextEditor.enrichHTML(data.systemData.description, {
            secrets: this.document.isOwner,
            async: true
        });
        console.log(data);
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}