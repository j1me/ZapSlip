"use client"

import type React from "react"

import { useState, useCallback } from "react"
import {
  Upload,
  X,
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  MapPin,
  Eye,
  Calendar,
  Users,
  Package,
  Tag,
  ArrowLeft,
  Files,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface UploadedFile {
  id: string
  name: string
  size: number
}

interface ProductSummary {
  id: string
  productName: string
  totalQuantity: number
  category: string
  orders: {
    customer: string
    address: string
    orderId: string
    quantity: number
    date: string
  }[]
}

interface CategorySummary {
  id: string
  categoryName: string
  totalProducts: number
  totalQuantity: number
  products: {
    productName: string
    quantity: number
    customer: string
    address: string
    orderId: string
    date: string
  }[]
}

export default function SlipScanApp() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set())
  const [currentScreen, setCurrentScreen] = useState<"upload" | "reports">("upload")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const { toast } = useToast()

  // Mock data for demonstration
  const productSummaries: ProductSummary[] = [
    {
      id: "1",
      productName: "Wireless Headphones",
      totalQuantity: 45,
      category: "Electronics",
      orders: [
        {
          customer: "TechCorp Inc.",
          address: "123 Business Ave, Suite 100, New York, NY 10001",
          orderId: "ORD-2024-001",
          quantity: 25,
          date: "2024-01-15",
        },
        {
          customer: "Digital Solutions LLC",
          address: "456 Innovation Dr, San Francisco, CA 94105",
          orderId: "ORD-2024-002",
          quantity: 20,
          date: "2024-01-16",
        },
      ],
    },
    {
      id: "2",
      productName: "Office Chair",
      totalQuantity: 12,
      category: "Furniture",
      orders: [
        {
          customer: "StartupHub Co.",
          address: "789 Startup Blvd, Austin, TX 78701",
          orderId: "ORD-2024-003",
          quantity: 12,
          date: "2024-01-17",
        },
      ],
    },
  ]

  const categorySummaries: CategorySummary[] = [
    {
      id: "1",
      categoryName: "Electronics",
      totalProducts: 3,
      totalQuantity: 85,
      products: [
        {
          productName: "Wireless Headphones",
          quantity: 45,
          customer: "TechCorp Inc.",
          address: "123 Business Ave, Suite 100, New York, NY 10001",
          orderId: "ORD-2024-001",
          date: "2024-01-15",
        },
        {
          productName: "Bluetooth Speaker",
          quantity: 40,
          customer: "Audio Pro Ltd.",
          address: "321 Sound St, Nashville, TN 37201",
          orderId: "ORD-2024-004",
          date: "2024-01-18",
        },
      ],
    },
  ]

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }, [])

  const handleFiles = (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === "application/pdf")

    if (pdfFiles.length !== files.length) {
      toast({
        title: "Invalid files detected",
        description: "Only PDF files are allowed.",
        variant: "destructive",
      })
    }

    if (uploadedFiles.length + pdfFiles.length > 10) {
      toast({
        title: "Upload limit exceeded",
        description: "Maximum 10 files allowed.",
        variant: "destructive",
      })
      return
    }

    const newFiles: UploadedFile[] = pdfFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    if (newFiles.length > 0) {
      toast({
        title: "Files uploaded",
        description: `${newFiles.length} file(s) added successfully.`,
      })
    }
  }

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files to process",
        description: "Please upload PDF files first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setCurrentScreen("reports")
    toast({
      title: "Processing complete",
      description: `Successfully processed ${uploadedFiles.length} file(s).`,
    })
  }

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleAddressExpansion = (key: string) => {
    setExpandedAddresses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const exportToExcel = () => {
    toast({
      title: "Export started",
      description: "Your Excel file will download shortly.",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SlipScan</h1>
              <p className="text-gray-600 mt-2">
                Upload multiple packing slips and view categorized product summaries.
              </p>
            </div>

            {/* Upload Summary Button */}
            {uploadedFiles.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentScreen(currentScreen === "upload" ? "reports" : "upload")}
                className="flex items-center gap-2"
              >
                {currentScreen === "upload" ? (
                  <>
                    <Files className="h-4 w-4" />
                    View Reports
                  </>
                ) : (
                  <>
                    <ArrowLeft className="h-4 w-4" />
                    Manage Files ({uploadedFiles.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentScreen === "upload" ? (
          /* Upload Screen */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Packing Slips
              </CardTitle>
              <CardDescription>Upload up to 10 PDF packing slips for processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your packing slips here or click to upload
                </p>
                <p className="text-sm text-gray-500 mb-4">PDF files only, maximum 10 files</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose Files
                  </label>
                </Button>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Uploaded Files ({uploadedFiles.length}/10)</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={processFiles}
                disabled={uploadedFiles.length === 0 || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing Files...
                  </>
                ) : (
                  "Process Files"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Reports Screen */
          <Card>
            <CardHeader>
              <CardTitle>Summary Reports</CardTitle>
              <CardDescription>View detailed summaries of your processed packing slips</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="products" className="w-full">
                {/* Inline Filters with Tabs */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                  <TabsList className="grid w-full lg:w-auto grid-cols-2">
                    <TabsTrigger value="products">Product Summary</TabsTrigger>
                    <TabsTrigger value="categories">Category Summary</TabsTrigger>
                  </TabsList>

                  {/* Inline Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                        className="w-auto text-sm"
                        placeholder="Start date"
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                        className="w-auto text-sm"
                        placeholder="End date"
                      />
                    </div>

                    <Select>
                      <SelectTrigger className="w-[140px]">
                        <Users className="h-4 w-4 mr-1" />
                        <SelectValue placeholder="Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="techcorp">TechCorp Inc.</SelectItem>
                        <SelectItem value="digital">Digital Solutions LLC</SelectItem>
                        <SelectItem value="startup">StartupHub Co.</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger className="w-[130px]">
                        <Package className="h-4 w-4 mr-1" />
                        <SelectValue placeholder="Products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="headphones">Wireless Headphones</SelectItem>
                        <SelectItem value="chair">Office Chair</SelectItem>
                        <SelectItem value="speaker">Bluetooth Speaker</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select>
                      <SelectTrigger className="w-[130px]">
                        <Tag className="h-4 w-4 mr-1" />
                        <SelectValue placeholder="Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TabsContent value="products" className="mt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Total Quantity</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productSummaries.map((product) => (
                          <>
                            <TableRow key={product.id} className="cursor-pointer hover:bg-gray-50">
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => toggleRowExpansion(product.id)}>
                                  {expandedRows.has(product.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{product.productName}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{product.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{product.totalQuantity}</TableCell>
                              <TableCell className="text-right">{product.orders.length}</TableCell>
                            </TableRow>
                            {expandedRows.has(product.id) && (
                              <TableRow>
                                <TableCell colSpan={5} className="p-0">
                                  <div className="bg-gray-50 p-4 space-y-3">
                                    {product.orders.map((order, index) => {
                                      const addressKey = `${product.id}-${index}`
                                      return (
                                        <div key={index} className="bg-white p-4 rounded-lg border">
                                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                            <div>
                                              <p className="font-medium text-gray-900">{order.customer}</p>
                                              <div className="mt-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => toggleAddressExpansion(addressKey)}
                                                  className="p-0 h-auto text-sm text-gray-600 hover:text-gray-900"
                                                >
                                                  <MapPin className="h-3 w-3 mr-1" />
                                                  {expandedAddresses.has(addressKey) ? "Hide Address" : "Show Address"}
                                                </Button>
                                                {expandedAddresses.has(addressKey) && (
                                                  <p className="text-sm text-gray-600 mt-1">{order.address}</p>
                                                )}
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-sm text-gray-500">Order ID</p>
                                              <p className="font-medium">{order.orderId}</p>
                                            </div>
                                            <div>
                                              <p className="text-sm text-gray-500">Quantity</p>
                                              <p className="font-medium">{order.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View PDF
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="categories" className="mt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Category Name</TableHead>
                          <TableHead className="text-right">Products</TableHead>
                          <TableHead className="text-right">Total Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categorySummaries.map((category) => (
                          <>
                            <TableRow key={category.id} className="cursor-pointer hover:bg-gray-50">
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => toggleRowExpansion(category.id)}>
                                  {expandedRows.has(category.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  {category.categoryName}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{category.totalProducts}</TableCell>
                              <TableCell className="text-right font-medium">{category.totalQuantity}</TableCell>
                            </TableRow>
                            {expandedRows.has(category.id) && (
                              <TableRow>
                                <TableCell colSpan={4} className="p-0">
                                  <div className="bg-gray-50 p-4 space-y-3">
                                    {category.products.map((product, index) => {
                                      const addressKey = `${category.id}-${index}`
                                      return (
                                        <div key={index} className="bg-white p-4 rounded-lg border">
                                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                                            <div>
                                              <p className="font-medium text-gray-900">{product.productName}</p>
                                              <p className="text-sm text-gray-500">Qty: {product.quantity}</p>
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900">{product.customer}</p>
                                              <div className="mt-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => toggleAddressExpansion(addressKey)}
                                                  className="p-0 h-auto text-sm text-gray-600 hover:text-gray-900"
                                                >
                                                  <MapPin className="h-3 w-3 mr-1" />
                                                  {expandedAddresses.has(addressKey) ? "Hide Address" : "Show Address"}
                                                </Button>
                                                {expandedAddresses.has(addressKey) && (
                                                  <p className="text-sm text-gray-600 mt-1">{product.address}</p>
                                                )}
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-sm text-gray-500">Order ID</p>
                                              <p className="font-medium">{product.orderId}</p>
                                            </div>
                                            <div>
                                              <p className="text-sm text-gray-500">Date</p>
                                              <p className="font-medium">{product.date}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View PDF
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Export Button - only show on reports screen */}
      {currentScreen === "reports" && (
        <Button
          onClick={exportToExcel}
          className="fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-lg font-medium">Processing your files...</p>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  )
}
