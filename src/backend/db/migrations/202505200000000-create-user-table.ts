import { DataTypes } from 'sequelize';
import { Migration } from '../umzug';

export const up: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  const transaction = await queryInterface.sequelize.transaction();

  try {
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('users'));

    if (!tableExists) {
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },

          firstName: {
            type: DataTypes.STRING,
            allowNull: false,
          },

          lastName: {
            type: DataTypes.STRING,
            allowNull: false,
          },

          password: {
            type: DataTypes.STRING,
            allowNull: false,
          },

          email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },

          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },

          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction },
      );
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};
