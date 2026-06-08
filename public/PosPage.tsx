"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  QrCode,
  TrashIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";

import type { IProduct } from "@/types/product";
import { useCategories } from "@/hooks/useCategories";
import type { ICategory } from "@/types/category";
import { toast } from "sonner";
import type { ICart } from "@/types/cart";
import SharedDialog from "@/components/SharedDialog";
import { useCreateOrder } from "@/hooks/useOrder";

import { Input } from "@/components/ui/input";
import { useProduct } from "@/hooks/useProduct";
import { Loading } from "@/components/Loading";
import type { OrderPayload } from "@/service/orders.service";
import { useCreatePayment } from "@/hooks/usePayment";

declare const AbaPayway: any;

export default function PosPage() {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [cartItems, setCartItems] = useState<ICart[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: productData } = useProduct(searchText, 1, 10, selectedCategory);
  const { data: categoryData } = useCategories();

  // Auto-hide success dialog after 10s
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => setIsSuccess(false), 10000);
    return () => clearTimeout(timer);
  }, [isSuccess]);

  const categories = (categoryData?.data as ICategory[]) ?? [];
  const allCategories = [{ id: undefined, name: "All" }, ...categories];

  // ✅ Read directly from React Query — no local state needed
  const products = (productData?.data as IProduct[]) ?? [];

  const queryClient = useQueryClient();

  // addToCart only manages cart state — stock updates after order via invalidateQueries
  const addToCart = (product: IProduct) => {
    if (product.qty <= 0) {
      toast.warning("Product out of stock");
      return;
    }

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.qty >= existingItem.stock) {
          toast.warning(`Only ${existingItem.stock} items available in stock`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          category: product.category?.name || "Uncategorized",
          price: Number(product.price),
          imageUrl: product.productImages?.[0]?.imageUrl || "/placeholder.svg",
          stock: product.qty,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id: number, qty: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (qty <= 0) return null;
          if (qty > item.stock) {
            toast.warning(`Only ${item.stock} items available in stock`);
            return item;
          }
          return { ...item, qty };
        })
        .filter(Boolean) as ICart[]
    );
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal;

  const { mutate: createOrderMutate } = useCreateOrder();
  const { mutate: createPaymentMutate } = useCreatePayment();

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      toast.warning("Cart is empty");
      return;
    }

    setIsLoading(true);

    const payload: OrderPayload = {
      discount: 0,
      items: cartItems.map((item) => ({
        productId: item.id,
        qty: item.qty,
      })),
    };

    createOrderMutate(payload, {
      onSuccess: (res) => {
        const orderId = res.data.id;

        createPaymentMutate(orderId, {
          onSuccess: (res) => {
            if (res.data) {
              const payway = res.data.payway;
              const form = document.createElement("form");
              form.id = "aba_merchant_request";
              form.method = payway.method;
              form.action = payway.action;
              form.target = payway.target;

              Object.entries(payway.fields).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = String(value);
                form.appendChild(input);
              });

              document.body.appendChild(form);

              setCartItems([]);
              setIsOpen(false);
              setIsSuccess(true);
              queryClient.invalidateQueries({ queryKey: ["products"] });
              AbaPayway?.checkout();
            }
          },
          onError: () => {
            toast.error("Payment failed. Please try again.");
          },
        });
      },
      onError: () => {
        toast.error("Order failed. Please try again.");
      },
      onSettled: () => {
        setIsLoading(false);
      },
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex h-screen">
        {/* ─── Main Content ─────────────────────────────── */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Categories</h1>
              <div className="flex items-center gap-2">
                <ChevronLeft className="text-muted-foreground h-5 w-5" />
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="border-b p-4">
            <div className="flex gap-2 overflow-x-auto">
              {allCategories.map((category, index) => (
                <div
                  key={index}
                  className={`hover:bg-muted flex min-w-[80px] cursor-pointer flex-col items-center rounded-lg p-2 transition-colors ${
                    selectedCategory === category.id
                      ? "bg-orange-300 font-semibold"
                      : "bg-orange-100"
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="text-center text-[18px] px-2 py-1">
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto p-6">
            <Input
              placeholder="Search product name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-[500px] mb-4"
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
              {products.map((item: IProduct) => (
                <Card
                  key={item.id}
                  className="group cursor-pointer overflow-hidden border-transparent bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-100"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={item.productImages?.[0]?.imageUrl ?? "/no-image.png"}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                        <div className="bg-white text-blue-600 p-3 rounded-full transform translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 shadow-lg">
                          <Plus className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {item?.category?.name || "Uncategorized"}
                        </span>
                        {/* ✅ Stock badge updates live as items are added/removed */}
                        <span
                          className={`text-xs font-semibold ${
                            item.qty > 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {item.qty > 0 ? `${item.qty} in stock` : "Out of stock"}
                        </span>
                      </div>
                      <h3 className="mb-3 line-clamp-1 text-base font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-blue-600">
                          ${Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar: Cart ───────────────────────── */}
        <div className="flex w-80 flex-col border-l">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cart ({cartItems.length})</h2>
              <div className="flex items-center gap-2">
                <Trash2
                  className="h-4 w-4 text-red-500 cursor-pointer"
                  onClick={() => setCartItems([])}
                />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {cartItems.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Cart is empty
                </p>
              )}
              {cartItems.map((item: ICart, index: number) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-3">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{item.name}</h4>
                    <p className="text-muted-foreground text-xs">{item.category}</p>
                    <p className="text-sm">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-semibold">${(item.price * item.qty).toFixed(2)}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        type="button"
                        onClick={() => updateQty(item.id, item.qty - 1)}
                      >
                        <MinusIcon className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        type="button"
                        onClick={() => updateQty(item.id, item.qty + 1)}
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex h-auto flex-col items-center bg-transparent p-4"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <span className="font-semibold text-green-600">$</span>
                </div>
                <span className="text-xs">Cash</span>
              </Button>
              <Button
                variant="outline"
                className="flex h-auto flex-col items-center bg-transparent p-4"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <QrCode className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-xs">Scan</span>
              </Button>
            </div>

            <Button
              onClick={() => cartItems.length > 0 && setIsOpen(true)}
              disabled={cartItems.length === 0}
              className="w-full bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Checkout ${total.toFixed(2)}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Order Summary Dialog ──────────────────────── */}
      <SharedDialog
        open={isOpen}
        setOpen={setIsOpen}
        isCancel={false}
        title="Order Summary"
        desc="Please review your order before placing"
      >
        <div className="space-y-4">
          {cartItems.map((item: ICart, index: number) => (
            <div key={`${item.id}-${index}`} className="flex items-center gap-4">
              <div className="bg-muted flex w-[60px] h-[60px] items-center justify-center rounded-lg overflow-hidden">
                <img src={item.imageUrl} alt={item.name} className="object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium">{item.name}</h4>
                <p className="text-muted-foreground text-xs">{item.category}</p>
                <div className="flex gap-4 text-sm">
                  <p className="text-primary">${item.price.toFixed(2)}</p>
                  <p>× {item.qty}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <p className="font-semibold">${(item.price * item.qty).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between items-center">
          <span className="font-semibold">Total</span>
          <p className="text-xl font-bold">${total.toFixed(2)}</p>
        </div>

        <Button onClick={handlePlaceOrder} type="button" className="w-full mt-6">
          Place Order
        </Button>
      </SharedDialog>

      {/* ─── Success Dialog ────────────────────────────── */}
      <SharedDialog
        open={isSuccess}
        setOpen={setIsSuccess}
        isCancel={false}
        title="Order Placed!"
        width="35%"
      >
        <div className="flex flex-col items-center justify-center py-4">
          <img className="w-[120px] h-[120px]" src="/no-images.png" alt="success icon" />
          <p className="text-xl mt-6 font-medium">Order created successfully!</p>
          <p className="text-muted-foreground text-sm mt-2">Thank you for your order.</p>
        </div>
      </SharedDialog>
    </div>
  );
}
