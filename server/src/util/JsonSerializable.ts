import { instanceToPlain } from "class-transformer";

abstract class JsonSerializable {

    constructor() {}

    toJSON() {
        return instanceToPlain(this);
    }

    toRealJSON() {
        return JSON.stringify(this);
    }
}

export default JsonSerializable;