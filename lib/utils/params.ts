import * as fs from "fs";

export class Parameters {
    private _application: string;
    private _environment: string;
    private _createdBy: string;
    private _os: string;
    private _legalEntity: string;
    private _country: string;
    private _description: string;
    private _lambdatimeout: number;
    private _lambdamemorysize: number;
    private _lambdaenvslackbottoken: string;
    private _lambdaenvslackchannelid: string;
    private _lambdaenvendpoints: string;
    private _lambdaenvloginendpoint: string;
    private _evenruleminutes: string;
    private _emailserviceaccount: string;
    private _emailservicerole: string;
    private _emailrecipients: string;

    constructor() {
        var params = JSON.parse(fs.readFileSync("./params.json", "utf8")).Parameters;
        this._application = params.Application;
        this._environment = params.Environment;
        this._createdBy = params.CreatedBy;
        this._os = params.Os;
        this._legalEntity = params.LegalEntity;
        this._country = params.Country;
        this._description = params.Description;
        this._lambdatimeout = params.LambdaTimeout;
        this._lambdamemorysize = params.LambdaMemorySize;
        this._lambdaenvslackbottoken = params.LambdaEnvSlackBotToken;
        this._lambdaenvslackchannelid = params.LambdaEnvSlackChannelId;
        this._lambdaenvendpoints = params.LambdaEnvEndpoints;
        this._lambdaenvloginendpoint = params.LambdaEnvLoginEndpoint;
        this._evenruleminutes = params.EventRuleMinutes;
        this._emailserviceaccount = params.EmailServiceAccount;
        this._emailservicerole = params.EmailServiceRole;
        this._emailrecipients = params.EmailRecipients;
    }

    get application(): string {
        return this._application;
    }
    get environment(): string {
        return this._environment;
    }
    get createdBy(): string {
        return this._createdBy;
    }
    get os(): string {
        return this._os;
    }
    get legalEntity(): string {
        return this._legalEntity;
    }
    get country(): string {
        return this._country;
    }
    get description(): string {
        return this._description;
    }
    get lambdatimeout(): number {
        return this._lambdatimeout;
    }
    get lambdamemorysize(): number {
        return this._lambdamemorysize;
    }
    get lambdaenvslackbottoken(): string {
        return this._lambdaenvslackbottoken;
    }
    get lambdaenvslackchannelid(): string {
        return this._lambdaenvslackchannelid;
    }
    get lambdaenvendpoints(): string {
        return this._lambdaenvendpoints;
    }
    get lambdaenvloginendpoint(): string {
        return this._lambdaenvloginendpoint;
    }
    get eventruleminutes(): string {
        return this._evenruleminutes;
    }
    get emailserviceaccount(): string {
        return this._emailserviceaccount;
    }
    get emailservicerole(): string {
        return this._emailservicerole;
    }
    get emailrecipients(): string {
        return this._emailrecipients;
    }
}
