export const convertTimestampToISO = (timestamp) => {
    if (!timestamp || isNaN(timestamp)) {
        throw new Error('Invalid timestamp provided');
    }

    try {
        return new Date(Number(timestamp)).toISOString();
    } catch (error) {
        console.error('Error converting timestamp:', error);
        return null;
    }
};
