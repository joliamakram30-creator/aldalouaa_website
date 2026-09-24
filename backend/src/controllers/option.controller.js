const prisma = require("../config/prisma");

// ======================================
// GET ALL SIZES
// ======================================

const getSizes = async (req, res) => {
  try {
    const sizes = await prisma.size.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      sizes,
    });
  } catch (error) {
    console.error("Get Sizes Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sizes",
    });
  }
};

// ======================================
// CREATE SIZE
// ======================================

const createSize = async (req, res) => {
  try {
    const { name } = req.body;

    const sizeName = String(name || "").trim();

    if (!sizeName) {
      return res.status(400).json({
        success: false,
        message: "Size name is required",
      });
    }

    const existingSize = await prisma.size.findUnique({
      where: {
        name: sizeName,
      },
    });

    if (existingSize) {
      return res.status(409).json({
        success: false,
        message: "Size already exists",
      });
    }

    const size = await prisma.size.create({
      data: {
        name: sizeName,
      },
    });

    res.status(201).json({
      success: true,
      message: "Size created successfully",
      size,
    });
  } catch (error) {
    console.error("Create Size Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create size",
    });
  }
};

// ======================================
// UPDATE SIZE
// ======================================

const updateSize = async (req, res) => {
  try {
    const sizeId = Number(req.params.id);
    const sizeName = String(req.body.name || "").trim();

    if (!Number.isInteger(sizeId) || sizeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid size ID",
      });
    }

    if (!sizeName) {
      return res.status(400).json({
        success: false,
        message: "Size name is required",
      });
    }

    const size = await prisma.size.findUnique({
      where: {
        id: sizeId,
      },
    });

    if (!size) {
      return res.status(404).json({
        success: false,
        message: "Size not found",
      });
    }

    const duplicate = await prisma.size.findFirst({
      where: {
        name: sizeName,
        NOT: {
          id: sizeId,
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Size already exists",
      });
    }

    const updatedSize = await prisma.size.update({
      where: {
        id: sizeId,
      },
      data: {
        name: sizeName,
      },
    });

    res.json({
      success: true,
      message: "Size updated successfully",
      size: updatedSize,
    });
  } catch (error) {
    console.error("Update Size Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update size",
    });
  }
};

// ======================================
// DELETE SIZE
// ======================================

const deleteSize = async (req, res) => {
  try {
    const sizeId = Number(req.params.id);

    if (!Number.isInteger(sizeId) || sizeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid size ID",
      });
    }

    const size = await prisma.size.findUnique({
      where: {
        id: sizeId,
      },

      include: {
        products: true,
      },
    });

    if (!size) {
      return res.status(404).json({
        success: false,
        message: "Size not found",
      });
    }

    if (size.products.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a size that is assigned to products",
      });
    }

    await prisma.size.delete({
      where: {
        id: sizeId,
      },
    });

    res.json({
      success: true,
      message: "Size deleted successfully",
    });
  } catch (error) {
    console.error("Delete Size Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete size",
    });
  }
};

// ======================================
// GET ALL COLORS
// ======================================

const getColors = async (req, res) => {
  try {
    const colors = await prisma.color.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      colors,
    });
  } catch (error) {
    console.error("Get Colors Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch colors",
    });
  }
};

// ======================================
// CREATE COLOR
// ======================================

const createColor = async (req, res) => {
  try {
    const { name, nameAr, hexCode } = req.body;

    const colorNameAr = String(nameAr || "").trim() || null;
    const colorName = String(name || "").trim() || colorNameAr || "";
    const colorHex = hexCode
      ? String(hexCode).trim()
      : null;

    if (!colorName) {
      return res.status(400).json({
        success: false,
        message: "Color name is required",
      });
    }

    const existingColor = await prisma.color.findUnique({
      where: {
        name: colorName,
      },
    });

    if (existingColor) {
      return res.status(409).json({
        success: false,
        message: "Color already exists",
      });
    }

    const color = await prisma.color.create({
      data: {
        name: colorName,
        nameAr: colorNameAr,
        hexCode: colorHex,
      },
    });

    res.status(201).json({
      success: true,
      message: "Color created successfully",
      color,
    });
  } catch (error) {
    console.error("Create Color Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create color",
    });
  }
};

// ======================================
// UPDATE COLOR
// ======================================

const updateColor = async (req, res) => {
  try {
    const colorId = Number(req.params.id);

    const colorNameAr = String(req.body.nameAr || "").trim() || null;

    const colorName = String(
      req.body.name || ""
    ).trim() || colorNameAr || "";

    const colorHex = req.body.hexCode
      ? String(req.body.hexCode).trim()
      : null;

    if (!Number.isInteger(colorId) || colorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid color ID",
      });
    }

    if (!colorName) {
      return res.status(400).json({
        success: false,
        message: "Color name is required",
      });
    }

    const color = await prisma.color.findUnique({
      where: {
        id: colorId,
      },
    });

    if (!color) {
      return res.status(404).json({
        success: false,
        message: "Color not found",
      });
    }

    const duplicate = await prisma.color.findFirst({
      where: {
        name: colorName,
        NOT: {
          id: colorId,
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Color already exists",
      });
    }

    const updatedColor = await prisma.color.update({
      where: {
        id: colorId,
      },

      data: {
        name: colorName,
        nameAr: colorNameAr,
        hexCode: colorHex,
      },
    });

    res.json({
      success: true,
      message: "Color updated successfully",
      color: updatedColor,
    });
  } catch (error) {
    console.error("Update Color Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update color",
    });
  }
};

// ======================================
// DELETE COLOR
// ======================================

const deleteColor = async (req, res) => {
  try {
    const colorId = Number(req.params.id);

    if (!Number.isInteger(colorId) || colorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid color ID",
      });
    }

    const color = await prisma.color.findUnique({
      where: {
        id: colorId,
      },

      include: {
        products: true,
      },
    });

    if (!color) {
      return res.status(404).json({
        success: false,
        message: "Color not found",
      });
    }

    if (color.products.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a color that is assigned to products",
      });
    }

    await prisma.color.delete({
      where: {
        id: colorId,
      },
    });

    res.json({
      success: true,
      message: "Color deleted successfully",
    });
  } catch (error) {
    console.error("Delete Color Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete color",
    });
  }
};
// ======================================
// GET ALL SCENTS
// ======================================

const getScents = async (req, res) => {
  try {
    const scents = await prisma.scent.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      scents,
    });
  } catch (error) {
    console.error("Get Scents Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch scents",
    });
  }
};

// ======================================
// CREATE SCENT
// ======================================

const createScent = async (req, res) => {
  try {
    const { name, nameAr } = req.body;

    const scentNameAr = String(nameAr || "").trim() || null;
    const scentName =
      String(name || "").trim() || scentNameAr || "";

    if (!scentName) {
      return res.status(400).json({
        success: false,
        message: "Scent name is required",
      });
    }

    const existingScent = await prisma.scent.findUnique({
      where: {
        name: scentName,
      },
    });

    if (existingScent) {
      return res.status(409).json({
        success: false,
        message: "Scent already exists",
      });
    }

    const scent = await prisma.scent.create({
      data: {
        name: scentName,
        nameAr: scentNameAr,
      },
    });

    res.status(201).json({
      success: true,
      message: "Scent created successfully",
      scent,
    });
  } catch (error) {
    console.error("Create Scent Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create scent",
    });
  }
};

// ======================================
// UPDATE SCENT
// ======================================

const updateScent = async (req, res) => {
  try {
    const scentId = Number(req.params.id);

    const scentNameAr =
      String(req.body.nameAr || "").trim() || null;

    const scentName =
      String(req.body.name || "").trim() ||
      scentNameAr ||
      "";

    if (!Number.isInteger(scentId) || scentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid scent ID",
      });
    }

    if (!scentName) {
      return res.status(400).json({
        success: false,
        message: "Scent name is required",
      });
    }

    const scent = await prisma.scent.findUnique({
      where: {
        id: scentId,
      },
    });

    if (!scent) {
      return res.status(404).json({
        success: false,
        message: "Scent not found",
      });
    }

    const duplicate = await prisma.scent.findFirst({
      where: {
        name: scentName,
        NOT: {
          id: scentId,
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Scent already exists",
      });
    }

    const updatedScent = await prisma.scent.update({
      where: {
        id: scentId,
      },
      data: {
        name: scentName,
        nameAr: scentNameAr,
      },
    });

    res.json({
      success: true,
      message: "Scent updated successfully",
      scent: updatedScent,
    });
  } catch (error) {
    console.error("Update Scent Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update scent",
    });
  }
};

// ======================================
// DELETE SCENT
// ======================================

const deleteScent = async (req, res) => {
  try {
    const scentId = Number(req.params.id);

    if (!Number.isInteger(scentId) || scentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid scent ID",
      });
    }

    const scent = await prisma.scent.findUnique({
      where: {
        id: scentId,
      },
      include: {
        products: true,
      },
    });

    if (!scent) {
      return res.status(404).json({
        success: false,
        message: "Scent not found",
      });
    }

    if (scent.products.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a scent that is assigned to products",
      });
    }

    await prisma.scent.delete({
      where: {
        id: scentId,
      },
    });

    res.json({
      success: true,
      message: "Scent deleted successfully",
    });
  } catch (error) {
    console.error("Delete Scent Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete scent",
    });
  }
};

module.exports = {
  getSizes,
  createSize,
  updateSize,
  deleteSize,

  getColors,
  createColor,
  updateColor,
  deleteColor,

  getScents,
  createScent,
  updateScent,
  deleteScent,
};