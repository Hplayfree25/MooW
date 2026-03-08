export function extractCharaDataFromPNG(buffer: ArrayBuffer): string | null {
    const dataView = new DataView(buffer);
    const uint8Array = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8');

    if (dataView.getUint32(0) !== 0x89504E47) {
        return null;
    }

    let offset = 8;
    while (offset < uint8Array.length) {
        const length = dataView.getUint32(offset);
        const typeOffset = offset + 4;

        if (typeOffset + 4 > uint8Array.length) break;

        const type = decoder.decode(uint8Array.slice(typeOffset, typeOffset + 4));

        if (type === 'tEXt') {
            const dataOffset = typeOffset + 4;
            const chunkData = uint8Array.slice(dataOffset, dataOffset + length);

            let nullIndex = -1;
            for (let i = 0; i < chunkData.length; i++) {
                if (chunkData[i] === 0) {
                    nullIndex = i;
                    break;
                }
            }

            if (nullIndex !== -1) {
                const keyword = decoder.decode(chunkData.slice(0, nullIndex));
                if (keyword === 'chara') {
                    return decoder.decode(chunkData.slice(nullIndex + 1));
                }
            }
        }

        offset += length + 12;
    }

    return null;
}
