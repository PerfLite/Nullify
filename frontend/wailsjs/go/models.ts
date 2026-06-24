export namespace main {
	
	export class AppPackage {
	    name: string;
	    version: string;
	    description: string;
	    size: string;
	    sizeBytes: number;
	    manager: string;
	    icon: string;
	    exec: string;
	
	    static createFrom(source: any = {}) {
	        return new AppPackage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.description = source["description"];
	        this.size = source["size"];
	        this.sizeBytes = source["sizeBytes"];
	        this.manager = source["manager"];
	        this.icon = source["icon"];
	        this.exec = source["exec"];
	    }
	}
	export class PackageDetails {
	    name: string;
	    version: string;
	    description: string;
	    size: string;
	    section: string;
	    priority: string;
	    homepage: string;
	    maintainer: string;
	    dependencies: string[];
	
	    static createFrom(source: any = {}) {
	        return new PackageDetails(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.description = source["description"];
	        this.size = source["size"];
	        this.section = source["section"];
	        this.priority = source["priority"];
	        this.homepage = source["homepage"];
	        this.maintainer = source["maintainer"];
	        this.dependencies = source["dependencies"];
	    }
	}

}

