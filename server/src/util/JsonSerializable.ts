import { instanceToPlain } from "class-transformer";

abstract class JsonSerializable {

    constructor() {}

    toJSON() {
        return instanceToPlain(this);
    }

    toRealJSON() {
        return JSON.stringify(
            instanceToPlain(this, { ignoreDecorators: true })
        );
    }
}

export default JsonSerializable;