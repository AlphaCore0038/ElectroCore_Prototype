import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { slug: "electrocore" },
    update: {
      name: "ElectroCore",
      description:
        "Curated electronics for creators and coders — headphones, keyboards, power and storage, shipped pan-India with 12-month warranty.",
      email: "support@electrocore.in",
      phone: "+91 98765 43210",
      address: "Bengaluru, Karnataka, India",
      currency: "INR",
      logoUrl: null,
    },
    create: {
      slug: "electrocore",
      name: "ElectroCore",
      description:
        "Curated electronics for creators and coders — headphones, keyboards, power and storage, shipped pan-India with 12-month warranty.",
      email: "support@electrocore.in",
      phone: "+91 98765 43210",
      address: "Bengaluru, Karnataka, India",
      currency: "INR",
      logoUrl: null,
    },
  });

  const products = [
    {
      slug: "sony-wh-1000xm5",
      sku: "SNY-WH1000XM5-BLK",
      name: "Sony WH-1000XM5 Wireless Headphones",
      description:
        "Industry-leading noise cancellation with 30-hour battery life. Ideal for focus work and travel.",
      category: "AUDIO" as const,
      price: 2999000,
      stock: 18,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Sony",
        model: "WH-1000XM5",
        color: "Black",
        connectivity: "bluetooth",
        warrantyMonths: 12,
        specs: { driverMm: 30, batteryHours: 30, weightGrams: 250 },
        compatibleWith: ["laptop", "phone", "anker-powercore-20000"],
      },
    },
    {
      slug: "keychron-k3-max",
      sku: "KEY-K3-MAX-RGB",
      name: "Keychron K3 Max Wireless Keyboard",
      description:
        "Ultra-slim 75% wireless mechanical keyboard with hot-swappable low-profile switches.",
      category: "PERIPHERALS" as const,
      price: 1649000,
      stock: 12,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Keychron",
        model: "K3 Max",
        color: "Black",
        connectivity: "bluetooth",
        warrantyMonths: 12,
        specs: { keys: 84, batteryHours: 40, backlight: "RGB" },
        compatibleWith: ["laptop", "logitech-mx-master-3s", "usb-c-hub-7in1"],
      },
    },
    {
      slug: "logitech-mx-master-3s",
      sku: "LOG-MX-MASTER-3S-GRY",
      name: "Logitech MX Master 3S Mouse",
      description:
        "Premium wireless mouse with 8000 DPI and quiet clicks. Pairs naturally with the K3 Max keyboard.",
      category: "PERIPHERALS" as const,
      price: 999000,
      stock: 0,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Logitech",
        model: "MX Master 3S",
        color: "Graphite",
        connectivity: "bluetooth",
        warrantyMonths: 12,
        specs: { dpi: 8000, batteryDays: 70, weightGrams: 141 },
        compatibleWith: ["laptop", "keychron-k3-max", "logitech-brio-4k"],
      },
    },
    {
      slug: "anker-powercore-20000",
      sku: "ANK-POWERCORE-20K",
      name: "Anker PowerCore 20000mAh Power Bank",
      description:
        "High-capacity power bank with 22.5W fast charging for phones, tablets and headphones.",
      category: "POWER" as const,
      price: 399000,
      stock: 40,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Anker",
        model: "PowerCore 20000",
        color: "Black",
        connectivity: "usb-c",
        warrantyMonths: 18,
        specs: { capacityMah: 20000, outputW: 22 },
        compatibleWith: ["sony-wh-1000xm5", "jbl-flip-6", "anker-usb-c-100w"],
      },
    },
    {
      slug: "anker-usb-c-100w",
      sku: "ANK-CABLE-100W-1M",
      name: "Anker USB-C to USB-C 100W Cable (1m)",
      description:
        "Braided 100W USB-C cable for laptops, power banks and fast-charging phones.",
      category: "CABLES" as const,
      price: 149000,
      stock: 60,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Anker",
        model: "765 Cable",
        color: "Black",
        connectivity: "usb-c",
        warrantyMonths: 12,
        specs: { lengthMeters: 1, powerW: 100 },
        compatibleWith: ["anker-powercore-20000", "usb-c-hub-7in1", "laptop-sleeve-14"],
      },
    },
    {
      slug: "samsung-t7-1tb",
      sku: "SAM-T7-1TB-BLU",
      name: "Samsung T7 Portable SSD 1TB",
      description:
        "Compact 1TB portable SSD with USB 3.2 and fast transfers for creators on the move.",
      category: "STORAGE" as const,
      price: 899000,
      stock: 7,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Samsung",
        model: "T7",
        color: "Blue",
        connectivity: "usb-c",
        warrantyMonths: 36,
        specs: { capacityGb: 1000, readMBps: 1050, weightGrams: 58 },
        compatibleWith: ["laptop", "usb-c-hub-7in1", "laptop-sleeve-14"],
      },
    },
    {
      slug: "laptop-sleeve-14",
      sku: "NUN-SLEEVE-14-GRY",
      name: "Native Union Laptop Sleeve 14-inch",
      description: "Minimal grey sleeve for 14-inch laptops with soft lining.",
      category: "ACCESSORIES" as const,
      price: 249000,
      stock: 22,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Native Union",
        model: "Sleeve 14",
        color: "Grey",
        connectivity: "wired",
        warrantyMonths: 12,
        specs: { sizeInch: 14, material: "Neoprene" },
        compatibleWith: ["samsung-t7-1tb", "usb-c-hub-7in1", "laptop"],
      },
    },
    {
      slug: "logitech-brio-4k",
      sku: "LOG-BRIO-4K-BLK",
      name: "Logitech Brio 100 Webcam",
      description:
        "Full HD webcam with auto light correction for work-from-home setups.",
      category: "PERIPHERALS" as const,
      price: 749000,
      stock: 9,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Logitech",
        model: "Brio 100",
        color: "Graphite",
        connectivity: "usb-a",
        warrantyMonths: 12,
        specs: { resolution: "1080p", mic: "integrated" },
        compatibleWith: ["laptop", "sony-wh-1000xm5", "logitech-mx-master-3s"],
      },
    },
    {
      slug: "jbl-flip-6",
      sku: "JBL-FLIP6-BLK",
      name: "JBL Flip 6 Bluetooth Speaker",
      description: "Portable waterproof Bluetooth speaker with bold sound.",
      category: "AUDIO" as const,
      price: 1199000,
      stock: 15,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "JBL",
        model: "Flip 6",
        color: "Black",
        connectivity: "bluetooth",
        warrantyMonths: 12,
        specs: { batteryHours: 12, waterproof: "IP67", weightGrams: 550 },
        compatibleWith: ["anker-powercore-20000", "laptop"],
      },
    },
    {
      slug: "usb-c-hub-7in1",
      sku: "ANK-HUB-7IN1-GRY",
      name: "Anker 7-in-1 USB-C Hub",
      description:
        "7-in-1 hub with HDMI, USB-A, SD card and 100W pass-through charging.",
      category: "ACCESSORIES" as const,
      price: 499000,
      stock: 14,
      status: "ACTIVE" as const,
      imageUrl: null,
      attributes: {
        brand: "Anker",
        model: "555 Hub",
        color: "Grey",
        connectivity: "usb-c",
        warrantyMonths: 18,
        specs: { ports: 7, hdmi: "4K60", sdSlots: 2 },
        compatibleWith: ["laptop", "samsung-t7-1tb", "laptop-sleeve-14", "anker-usb-c-100w"],
      },
    },
  ];

  for (const p of products) {
    const data = {
      sku: p.sku,
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      stock: p.stock,
      status: p.status,
      imageUrl: p.imageUrl,
      attributes: p.attributes,
      merchantId: merchant.id,
    };
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });
  }

  const merchantCount = await prisma.merchant.count();
  const productCount = await prisma.product.count({ where: { merchantId: merchant.id } });
  console.log(`Seed complete: ${merchantCount} merchant(s), ${productCount} products for ${merchant.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
