import { instanceToPlain } from "class-transformer";

abstract class JsonSerializable {

    constructor() {}

    toJSON() {
        return instanceToPlain(this);
    }
}

export default JsonSerializable;