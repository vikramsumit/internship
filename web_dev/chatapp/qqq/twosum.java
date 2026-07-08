class twosum {

    public static void main(String args[]) {

        int nums[] = { 2, 11, 15, 7 };
        int target = 9;

        for (int i = 0; i < nums.length; i++) {
            for (int j = 1; j < nums.length; j++) {
                // if ((nums[i] + nums[j]) == target) {
                if ((nums[i] + nums[j]) == target) {

                    System.out.println("[" + i + "," + j + "]");
                    return;
                }
                // } else {
                // System.out.println("target value not exist in this array");
                // }

            }

        }

    }

}