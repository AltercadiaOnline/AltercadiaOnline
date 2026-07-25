// @ts-nocheck
export function sumEquipSlotPercents(map) {
    if (!map)
        return 0;
    let sum = 0;
    for (const value of Object.values(map)) {
        if (typeof value === 'number')
            sum += value;
    }
    return sum;
}
