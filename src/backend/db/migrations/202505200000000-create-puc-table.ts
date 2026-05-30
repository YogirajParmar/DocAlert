import { DataTypes } from 'sequelize';
import { Migration } from '../umzug';

export const up: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  const transaction = await queryInterface.sequelize.transaction();

  try {
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('pucs'));

    if (!tableExists) {
      await queryInterface.createTable(
        'pucs',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          vehicleNumber: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          vehicleType: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          issueDate: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          expirationDate: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          documentType: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
