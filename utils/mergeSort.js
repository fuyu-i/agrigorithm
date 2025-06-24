// Merge Sort Algorithm Implementation in JavaScript

// Merge Sort implementation
function mergeSort(arr, start, end, compareFunction) {
  if (start < end) {
    const mid = Math.floor((start + end) / 2);
    mergeSort(arr, start, mid, compareFunction);
    mergeSort(arr, mid + 1, end, compareFunction);
    merge(arr, start, mid, end, compareFunction);
  }
}

function merge(arr, start, mid, end, compareFunction) {
  // Create temporary arrays for left and right subarrays
  const leftSize = mid - start + 1;
  const rightSize = end - mid;
  
  const leftArray = [];
  const rightArray = [];
  
  // Copy data to temporary arrays
  for (let i = 0; i < leftSize; i++) {
    leftArray[i] = arr[start + i];
  }
  for (let i = 0; i < rightSize; i++) {
    rightArray[i] = arr[mid + 1 + i];
  }
  
  // Merge the temporary arrays back into arr[start..end]
  let i = 0; // Initial index of left subarray
  let j = 0; // Initial index of right subarray
  let k = start; // Initial index of merged subarray
  
  while (i < leftSize && j < rightSize) {
    if (compareFunction(leftArray[i], rightArray[j]) <= 0) {
      arr[k] = leftArray[i];
      i++;
    } else {
      arr[k] = rightArray[j];
      j++;
    }
    k++;
  }
  
  // Copy the remaining elements of leftArray[], if any
  while (i < leftSize) {
    arr[k] = leftArray[i];
    i++;
    k++;
  }
  
  // Copy the remaining elements of rightArray[], if any
  while (j < rightSize) {
    arr[k] = rightArray[j];
    j++;
    k++;
  }
}

module.exports = {
  mergeSort,
  merge
};