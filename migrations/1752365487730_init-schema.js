exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.createTable("users", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        phone: { type: "text", unique: true, notNull: true },
        created_at: { type: "timestamptz", default: pgm.func("now()") },
    });

    pgm.createTable("expenses", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        user_id: { type: "uuid", references: "users(id)" },
        category: { type: "text" },
        amount: { type: "numeric" },
        created_at: { type: "timestamptz", default: pgm.func("now()") },
    });
};

exports.down = (pgm) => {
    pgm.dropTable("expenses");
    pgm.dropTable("users");
};
